import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeedData } from "@/data/seed";
import { qtyByItem } from "@/lib/domain";
import { docNumber, uid } from "@/lib/id";
import { formatNumber } from "@/lib/format";
import { selectItemMap, selectStockLevels } from "@/lib/selectors";
import type {
  ActionResult,
  DocEvent,
  DocEventKind,
  InventoryData,
  Item,
  LineItem,
  Party,
  PurchaseOrder,
  SalesOrder,
  StockMovement,
} from "@/types";

/*
 * The only place that mutates inventory data.
 *
 * Invariants
 * - Item quantity is never stored: it is the sum of ledger movements.
 * - Stock moves only through receivePO, fulfilSale, adjustStock and the
 *   opening balance written by addItem — each writes ledger entries and the
 *   document status change in a single `set`, so they can't drift apart.
 * - Transitions are guarded: a PO is received at most once, a sale is
 *   fulfilled at most once, and cancelling is only allowed before stock moved.
 */

export type ItemInput = Omit<Item, "id" | "createdAt">;
export type PartyInput = Omit<Party, "id" | "createdAt">;
export interface SaleInput {
  customerId: string;
  date: string;
  lines: LineItem[];
  notes?: string;
}
export interface PurchaseInput {
  supplierId: string;
  date: string;
  expectedDate?: string;
  lines: LineItem[];
  notes?: string;
}

interface InventoryActions {
  addItem: (input: ItemInput, openingQty?: number) => ActionResult<Item>;
  updateItem: (id: string, input: ItemInput) => ActionResult<Item>;
  adjustStock: (itemId: string, qtyDelta: number, reason: string) => ActionResult<StockMovement>;

  addCustomer: (input: PartyInput) => ActionResult<Party>;
  updateCustomer: (id: string, input: PartyInput) => ActionResult<Party>;
  addSupplier: (input: PartyInput) => ActionResult<Party>;
  updateSupplier: (id: string, input: PartyInput) => ActionResult<Party>;

  createSale: (input: SaleInput, confirm: boolean) => ActionResult<SalesOrder>;
  confirmSale: (id: string) => ActionResult<SalesOrder>;
  fulfilSale: (id: string) => ActionResult<SalesOrder>;
  cancelSale: (id: string) => ActionResult<SalesOrder>;

  createPurchase: (input: PurchaseInput) => ActionResult<PurchaseOrder>;
  receivePurchase: (id: string) => ActionResult<PurchaseOrder>;
  cancelPurchase: (id: string) => ActionResult<PurchaseOrder>;

  resetDemo: () => void;
}

export type InventoryState = InventoryData & InventoryActions;

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = <T>(error: string, details?: string[]): ActionResult<T> => ({ ok: false, error, details });
const now = () => new Date().toISOString();
const event = (kind: DocEventKind, refId: string, refNumber: string): DocEvent => ({
  id: uid("evt"),
  kind,
  refId,
  refNumber,
  timestamp: now(),
});

function validateLines(lines: LineItem[], items: Item[]): string | null {
  if (lines.length === 0) return "Add at least one line item.";
  const known = selectItemMap(items);
  for (const l of lines) {
    if (!known.has(l.itemId)) return "One of the line items no longer exists.";
    if (!Number.isInteger(l.qty) || l.qty <= 0) return "Quantities must be whole numbers above zero.";
    if (!(l.unitPrice >= 0)) return "Prices can't be negative.";
  }
  return null;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      ...createSeedData(),

      /* ------------------------------ Items ----------------------------- */

      addItem: (input, openingQty = 0) => {
        const { items } = get();
        if (items.some((i) => i.sku.toLowerCase() === input.sku.toLowerCase())) {
          return fail(`SKU ${input.sku} is already in use.`);
        }
        const item: Item = { ...input, id: uid("itm"), createdAt: now() };
        const movements: StockMovement[] =
          openingQty > 0
            ? [
                {
                  id: uid("mov"),
                  type: "opening",
                  itemId: item.id,
                  qtyDelta: openingQty,
                  refDoc: { kind: "OPEN", id: item.id, number: "Opening" },
                  note: "Opening balance",
                  timestamp: item.createdAt,
                },
              ]
            : [];
        set((s) => ({
          items: [...s.items, item],
          movements: [...s.movements, ...movements],
          events: [...s.events, event("item.created", item.id, item.sku)],
        }));
        return ok(item);
      },

      updateItem: (id, input) => {
        const { items } = get();
        const existing = items.find((i) => i.id === id);
        if (!existing) return fail("Item not found.");
        if (items.some((i) => i.id !== id && i.sku.toLowerCase() === input.sku.toLowerCase())) {
          return fail(`SKU ${input.sku} is already in use.`);
        }
        const updated: Item = { ...existing, ...input };
        set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
        return ok(updated);
      },

      adjustStock: (itemId, qtyDelta, reason) => {
        const { items, movements, counters } = get();
        const item = items.find((i) => i.id === itemId);
        if (!item) return fail("Item not found.");
        if (!Number.isInteger(qtyDelta) || qtyDelta === 0) return fail("Enter a whole, non-zero quantity.");
        const onHand = selectStockLevels(movements).get(itemId) ?? 0;
        if (onHand + qtyDelta < 0) {
          return fail(`Only ${formatNumber(onHand)} ${item.unit} on hand — can't remove ${formatNumber(-qtyDelta)}.`);
        }
        const seq = counters.adj + 1;
        const movement: StockMovement = {
          id: uid("mov"),
          type: "adjustment",
          itemId,
          qtyDelta,
          refDoc: { kind: "ADJ", id: uid("adj"), number: docNumber("ADJ", seq) },
          note: reason.trim() || undefined,
          timestamp: now(),
        };
        set((s) => ({ movements: [...s.movements, movement], counters: { ...s.counters, adj: seq } }));
        return ok(movement);
      },

      /* ----------------------------- Parties ---------------------------- */

      addCustomer: (input) => {
        const party: Party = { ...input, id: uid("cus"), createdAt: now() };
        set((s) => ({ customers: [...s.customers, party] }));
        return ok(party);
      },
      updateCustomer: (id, input) => {
        const existing = get().customers.find((c) => c.id === id);
        if (!existing) return fail("Customer not found.");
        const updated = { ...existing, ...input };
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? updated : c)) }));
        return ok(updated);
      },
      addSupplier: (input) => {
        const party: Party = { ...input, id: uid("sup"), createdAt: now() };
        set((s) => ({ suppliers: [...s.suppliers, party] }));
        return ok(party);
      },
      updateSupplier: (id, input) => {
        const existing = get().suppliers.find((c) => c.id === id);
        if (!existing) return fail("Supplier not found.");
        const updated = { ...existing, ...input };
        set((s) => ({ suppliers: s.suppliers.map((c) => (c.id === id ? updated : c)) }));
        return ok(updated);
      },

      /* ------------------------------ Sales ----------------------------- */

      createSale: (input, confirm) => {
        const { items, customers, counters } = get();
        if (!customers.some((c) => c.id === input.customerId)) return fail("Choose a customer.");
        const lineError = validateLines(input.lines, items);
        if (lineError) return fail(lineError);
        const seq = counters.sale + 1;
        const ts = now();
        const sale: SalesOrder = {
          id: uid("so"),
          number: docNumber("INV", seq),
          customerId: input.customerId,
          date: input.date,
          status: confirm ? "confirmed" : "draft",
          lines: input.lines,
          notes: input.notes?.trim() || undefined,
          createdAt: ts,
          confirmedAt: confirm ? ts : undefined,
        };
        const events = [event("sale.created", sale.id, sale.number)];
        if (confirm) events.push(event("sale.confirmed", sale.id, sale.number));
        set((s) => ({
          sales: [...s.sales, sale],
          events: [...s.events, ...events],
          counters: { ...s.counters, sale: seq },
        }));
        return ok(sale);
      },

      confirmSale: (id) => {
        const sale = get().sales.find((s) => s.id === id);
        if (!sale) return fail("Invoice not found.");
        if (sale.status !== "draft") return fail(`${sale.number} is already ${sale.status}.`);
        const updated: SalesOrder = { ...sale, status: "confirmed", confirmedAt: now() };
        set((s) => ({
          sales: s.sales.map((x) => (x.id === id ? updated : x)),
          events: [...s.events, event("sale.confirmed", id, sale.number)],
        }));
        return ok(updated);
      },

      fulfilSale: (id) => {
        const { sales, items, movements } = get();
        const sale = sales.find((s) => s.id === id);
        if (!sale) return fail("Invoice not found.");
        if (sale.status === "fulfilled") return fail(`${sale.number} has already been fulfilled.`);
        if (sale.status !== "confirmed") return fail(`Only confirmed invoices can be fulfilled.`);

        const levels = selectStockLevels(movements);
        const itemMap = selectItemMap(items);
        const needed = qtyByItem(sale.lines);
        const shortages: string[] = [];
        for (const [itemId, qty] of needed) {
          const available = levels.get(itemId) ?? 0;
          if (available < qty) {
            const item = itemMap.get(itemId);
            shortages.push(
              `${item?.name ?? "Unknown item"}: need ${formatNumber(qty)}, only ${formatNumber(available)} available`,
            );
          }
        }
        if (shortages.length > 0) {
          return fail(`Not enough stock to fulfil ${sale.number}.`, shortages);
        }

        const ts = now();
        const ref = { kind: "SO" as const, id: sale.id, number: sale.number };
        const out: StockMovement[] = [...needed].map(([itemId, qty]) => ({
          id: uid("mov"),
          type: "sale_fulfilment",
          itemId,
          qtyDelta: -qty,
          refDoc: ref,
          timestamp: ts,
        }));
        const updated: SalesOrder = { ...sale, status: "fulfilled", fulfilledAt: ts };
        set((s) => ({
          sales: s.sales.map((x) => (x.id === id ? updated : x)),
          movements: [...s.movements, ...out],
        }));
        return ok(updated);
      },

      cancelSale: (id) => {
        const sale = get().sales.find((s) => s.id === id);
        if (!sale) return fail("Invoice not found.");
        if (sale.status === "fulfilled") return fail(`${sale.number} is fulfilled — stock has shipped, so it can't be cancelled.`);
        if (sale.status === "cancelled") return fail(`${sale.number} is already cancelled.`);
        const updated: SalesOrder = { ...sale, status: "cancelled", cancelledAt: now() };
        set((s) => ({
          sales: s.sales.map((x) => (x.id === id ? updated : x)),
          events: [...s.events, event("sale.cancelled", id, sale.number)],
        }));
        return ok(updated);
      },

      /* ---------------------------- Purchases --------------------------- */

      createPurchase: (input) => {
        const { items, suppliers, counters } = get();
        if (!suppliers.some((x) => x.id === input.supplierId)) return fail("Choose a supplier.");
        const lineError = validateLines(input.lines, items);
        if (lineError) return fail(lineError);
        const seq = counters.po + 1;
        const po: PurchaseOrder = {
          id: uid("po"),
          number: docNumber("PO", seq),
          supplierId: input.supplierId,
          date: input.date,
          expectedDate: input.expectedDate,
          status: "pending",
          lines: input.lines,
          notes: input.notes?.trim() || undefined,
          createdAt: now(),
        };
        set((s) => ({
          purchases: [...s.purchases, po],
          events: [...s.events, event("po.created", po.id, po.number)],
          counters: { ...s.counters, po: seq },
        }));
        return ok(po);
      },

      receivePurchase: (id) => {
        const po = get().purchases.find((p) => p.id === id);
        if (!po) return fail("Purchase order not found.");
        if (po.status === "received") return fail(`${po.number} has already been received.`);
        if (po.status === "cancelled") return fail(`${po.number} is cancelled and can't be received.`);
        const ts = now();
        const ref = { kind: "PO" as const, id: po.id, number: po.number };
        const incoming: StockMovement[] = [...qtyByItem(po.lines)].map(([itemId, qty]) => ({
          id: uid("mov"),
          type: "purchase_receipt",
          itemId,
          qtyDelta: qty,
          refDoc: ref,
          timestamp: ts,
        }));
        const updated: PurchaseOrder = { ...po, status: "received", receivedAt: ts };
        set((s) => ({
          purchases: s.purchases.map((x) => (x.id === id ? updated : x)),
          movements: [...s.movements, ...incoming],
        }));
        return ok(updated);
      },

      cancelPurchase: (id) => {
        const po = get().purchases.find((p) => p.id === id);
        if (!po) return fail("Purchase order not found.");
        if (po.status === "received") return fail(`${po.number} is received — stock is already in, so it can't be cancelled.`);
        if (po.status === "cancelled") return fail(`${po.number} is already cancelled.`);
        const updated: PurchaseOrder = { ...po, status: "cancelled", cancelledAt: now() };
        set((s) => ({
          purchases: s.purchases.map((x) => (x.id === id ? updated : x)),
          events: [...s.events, event("po.cancelled", id, po.number)],
        }));
        return ok(updated);
      },

      resetDemo: () => set(createSeedData()),
    }),
    {
      name: "stockpilot:data",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually on the client (see StoreHydrator) to avoid SSR mismatches.
      skipHydration: true,
      partialize: ({ items, movements, customers, suppliers, sales, purchases, events, counters }): InventoryData => ({
        items,
        movements,
        customers,
        suppliers,
        sales,
        purchases,
        events,
        counters,
      }),
    },
  ),
);
