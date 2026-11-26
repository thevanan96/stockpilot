import {
  eachMonthOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { docTotal, docUnits, stockStatus } from "@/lib/domain";
import type {
  DateRange,
  DocEvent,
  InventoryData,
  Item,
  ItemWithStock,
  Party,
  PurchaseOrder,
  SalesOrder,
  StockMovement,
} from "@/types";

/*
 * Derived data. Nothing here is persisted: quantities, low-stock flags,
 * KPIs and the activity feed are all computed from the ledger + documents.
 * Selectors are memoised on input references, so components can call them
 * freely after selecting raw slices from the store.
 */

function memoize<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | undefined;
  let lastResult: R;
  return (...args: A) => {
    if (lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs![i]))) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

/* ----------------------------- Stock ------------------------------ */

export const selectStockLevels = memoize((movements: StockMovement[]) => {
  const levels = new Map<string, number>();
  for (const m of movements) levels.set(m.itemId, (levels.get(m.itemId) ?? 0) + m.qtyDelta);
  return levels;
});

export function withStock(item: Item, quantity: number): ItemWithStock {
  return { ...item, quantity, status: stockStatus(quantity, item.minLevel), stockValue: quantity * item.costPrice };
}

export const selectItemsWithStock = memoize((items: Item[], movements: StockMovement[]): ItemWithStock[] => {
  const levels = selectStockLevels(movements);
  return items.map((item) => withStock(item, levels.get(item.id) ?? 0));
});

/** Items at or below their minimum level, most urgent first. */
export const selectLowStock = memoize((items: Item[], movements: StockMovement[]) =>
  selectItemsWithStock(items, movements)
    .filter((i) => i.status !== "in_stock")
    .sort((a, b) => a.quantity / Math.max(a.minLevel, 1) - b.quantity / Math.max(b.minLevel, 1)),
);

export interface HistoryRow extends StockMovement {
  balance: number;
}

/** Every movement for one item, newest first, with the running balance after each. */
export function selectItemHistory(itemId: string, movements: StockMovement[]): HistoryRow[] {
  let balance = 0;
  const rows = movements
    .filter((m) => m.itemId === itemId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((m) => ({ ...m, balance: (balance += m.qtyDelta) }));
  return rows.reverse();
}

/** Stock value at an instant, by replaying the ledger up to that point. */
function stockValueAt(items: Item[], movements: StockMovement[], at: Date) {
  const cost = new Map(items.map((i) => [i.id, i.costPrice]));
  const iso = at.toISOString();
  return movements.reduce((sum, m) => (m.timestamp <= iso ? sum + m.qtyDelta * (cost.get(m.itemId) ?? 0) : sum), 0);
}

/* ---------------------------- Dashboard ---------------------------- */

export interface Kpis {
  totalItems: number;
  totalUnits: number;
  stockValue: number;
  stockValueChange: number | null;
  openSales: { count: number; value: number; drafts: number; confirmed: number };
  pendingPurchases: { count: number; value: number; overdue: number; nextExpected?: string };
  lowStockCount: number;
  outOfStockCount: number;
}

export const selectKpis = memoize(
  (items: Item[], movements: StockMovement[], sales: SalesOrder[], purchases: PurchaseOrder[]): Kpis => {
    const stock = selectItemsWithStock(items, movements);
    const stockValue = stock.reduce((s, i) => s + i.stockValue, 0);
    const monthAgo = stockValueAt(items, movements, subDays(new Date(), 30));
    const open = sales.filter((s) => s.status === "draft" || s.status === "confirmed");
    const pending = purchases.filter((p) => p.status === "pending");
    const nowIso = new Date().toISOString();
    const expected = pending.map((p) => p.expectedDate).filter((d): d is string => Boolean(d));
    const nextExpected = expected.filter((d) => d >= nowIso).sort()[0];

    return {
      totalItems: items.length,
      totalUnits: stock.reduce((s, i) => s + i.quantity, 0),
      stockValue,
      stockValueChange: monthAgo > 0 ? ((stockValue - monthAgo) / monthAgo) * 100 : null,
      openSales: {
        count: open.length,
        value: open.reduce((s, o) => s + docTotal(o.lines), 0),
        drafts: open.filter((o) => o.status === "draft").length,
        confirmed: open.filter((o) => o.status === "confirmed").length,
      },
      pendingPurchases: {
        count: pending.length,
        value: pending.reduce((s, p) => s + docTotal(p.lines), 0),
        overdue: expected.filter((d) => d < nowIso).length,
        nextExpected,
      },
      lowStockCount: stock.filter((i) => i.status === "low").length,
      outOfStockCount: stock.filter((i) => i.status === "out").length,
    };
  },
);

export interface MonthlyPoint {
  key: string;
  month: string;
  sales: number;
  purchases: number;
}

/** Sales (confirmed + fulfilled) vs purchases (non-cancelled), by document month. */
export const selectMonthlyTotals = memoize(
  (sales: SalesOrder[], purchases: PurchaseOrder[], months: number): MonthlyPoint[] => {
    const now = new Date();
    const buckets = eachMonthOfInterval({ start: startOfMonth(subMonths(now, months - 1)), end: now }).map((d) => ({
      key: format(d, "yyyy-MM"),
      month: format(d, "MMM"),
      sales: 0,
      purchases: 0,
    }));
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const s of sales) {
      if (s.status === "confirmed" || s.status === "fulfilled") {
        const b = byKey.get(s.date.slice(0, 7));
        if (b) b.sales += docTotal(s.lines);
      }
    }
    for (const p of purchases) {
      if (p.status !== "cancelled") {
        const b = byKey.get(p.date.slice(0, 7));
        if (b) b.purchases += docTotal(p.lines);
      }
    }
    return buckets;
  },
);

export interface CategoryValue {
  category: Item["category"];
  value: number;
  units: number;
  share: number;
}

/** Stock value at cost per category, largest first. */
export const selectStockByCategory = memoize((items: Item[], movements: StockMovement[]): CategoryValue[] => {
  const totals = new Map<Item["category"], { value: number; units: number }>();
  for (const i of selectItemsWithStock(items, movements)) {
    const t = totals.get(i.category) ?? { value: 0, units: 0 };
    t.value += i.stockValue;
    t.units += i.quantity;
    totals.set(i.category, t);
  }
  const grand = [...totals.values()].reduce((s, t) => s + t.value, 0) || 1;
  return [...totals.entries()]
    .map(([category, t]) => ({ category, ...t, share: t.value / grand }))
    .sort((a, b) => b.value - a.value);
});

/* --------------------------- Activity feed -------------------------- */

export type ActivityEntry =
  | {
      id: string;
      kind: "stock";
      type: "purchase_receipt" | "sale_fulfilment" | "adjustment";
      timestamp: string;
      ref: StockMovement["refDoc"];
      lines: number;
      units: number;
      itemId: string;
      note?: string;
    }
  | { id: string; kind: "event"; type: DocEvent["kind"]; timestamp: string; refId: string; refNumber: string };

/**
 * Merge ledger movements (grouped per source document) with document
 * lifecycle events into one reverse-chronological feed.
 */
export const selectActivity = memoize((movements: StockMovement[], events: DocEvent[]): ActivityEntry[] => {
  const groups = new Map<string, Extract<ActivityEntry, { kind: "stock" }>>();
  for (const m of movements) {
    if (m.type === "opening") continue;
    const key = `${m.refDoc.kind}:${m.refDoc.id}:${m.timestamp}`;
    const g = groups.get(key);
    if (g) {
      g.lines += 1;
      g.units += m.qtyDelta;
    } else {
      groups.set(key, {
        id: m.id,
        kind: "stock",
        type: m.type,
        timestamp: m.timestamp,
        ref: m.refDoc,
        lines: 1,
        units: m.qtyDelta,
        itemId: m.itemId,
        note: m.note,
      });
    }
  }
  const docEvents: ActivityEntry[] = events.map((e) => ({
    id: e.id,
    kind: "event",
    type: e.kind,
    timestamp: e.timestamp,
    refId: e.refId,
    refNumber: e.refNumber,
  }));
  return [...groups.values(), ...docEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
});

/* ------------------------------ Parties ----------------------------- */

export interface PartyStats {
  orders: number;
  total: number;
  lastOrder?: string;
}

function partyStats<T extends { status: string; date: string; lines: SalesOrder["lines"] }>(
  docs: T[],
  partyOf: (d: T) => string,
) {
  const stats = new Map<string, PartyStats>();
  for (const d of docs) {
    if (d.status === "cancelled") continue;
    const id = partyOf(d);
    const s = stats.get(id) ?? { orders: 0, total: 0 };
    s.orders += 1;
    s.total += docTotal(d.lines);
    if (!s.lastOrder || d.date > s.lastOrder) s.lastOrder = d.date;
    stats.set(id, s);
  }
  return stats;
}

export const selectCustomerStats = memoize((sales: SalesOrder[]) => partyStats(sales, (s) => s.customerId));
export const selectSupplierStats = memoize((purchases: PurchaseOrder[]) => partyStats(purchases, (p) => p.supplierId));

export function byId<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]));
}

export const selectPartyMap = memoize((parties: Party[]) => byId(parties));
export const selectItemMap = memoize((items: Item[]) => byId(items));

/* ------------------------------ Reports ----------------------------- */

function inRange(iso: string, range: DateRange) {
  return isWithinInterval(new Date(iso), { start: startOfDay(range.from), end: endOfDay(range.to) });
}

export interface StockReportRow {
  item: Item;
  opening: number;
  received: number;
  sold: number;
  adjusted: number;
  closing: number;
  closingValue: number;
}

/** Per-item stock roll-forward for a period, straight from the ledger. */
export function selectStockReport(data: Pick<InventoryData, "items" | "movements">, range: DateRange): StockReportRow[] {
  const start = startOfDay(range.from).toISOString();
  const end = endOfDay(range.to).toISOString();
  const rows = new Map(
    data.items.map((item) => [item.id, { item, opening: 0, received: 0, sold: 0, adjusted: 0, closing: 0, closingValue: 0 }]),
  );
  for (const m of data.movements) {
    const row = rows.get(m.itemId);
    if (!row || m.timestamp > end) continue;
    if (m.timestamp < start) {
      row.opening += m.qtyDelta;
      continue;
    }
    if (m.type === "purchase_receipt") row.received += m.qtyDelta;
    else if (m.type === "sale_fulfilment") row.sold += -m.qtyDelta;
    else row.adjusted += m.qtyDelta;
  }
  return [...rows.values()].map((r) => {
    const closing = r.opening + r.received - r.sold + r.adjusted;
    return { ...r, closing, closingValue: closing * r.item.costPrice };
  });
}

export interface DocReportRow<T> {
  doc: T;
  partyName: string;
  units: number;
  total: number;
}

export function selectSalesReport(
  data: Pick<InventoryData, "sales" | "customers">,
  range: DateRange,
): DocReportRow<SalesOrder>[] {
  const parties = selectPartyMap(data.customers);
  return data.sales
    .filter((s) => inRange(s.date, range))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((doc) => ({
      doc,
      partyName: parties.get(doc.customerId)?.name ?? "Unknown customer",
      units: docUnits(doc.lines),
      total: docTotal(doc.lines),
    }));
}

export function selectPurchaseReport(
  data: Pick<InventoryData, "purchases" | "suppliers">,
  range: DateRange,
): DocReportRow<PurchaseOrder>[] {
  const parties = selectPartyMap(data.suppliers);
  return data.purchases
    .filter((p) => inRange(p.date, range))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((doc) => ({
      doc,
      partyName: parties.get(doc.supplierId)?.name ?? "Unknown supplier",
      units: docUnits(doc.lines),
      total: docTotal(doc.lines),
    }));
}
