"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, PackageCheck, TriangleExclamationPoint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocLines, DocMeta, DocTimeline, DocumentDrawer, SectionLabel, type TimelineStep } from "@/components/documents/doc-parts";
import { docUnits, qtyByItem } from "@/lib/domain";
import { formatDate, formatNumber } from "@/lib/format";
import { selectItemMap, selectItemsWithStock, selectPartyMap, selectStockLevels } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useRetained } from "@/hooks/use-retained";
import type { SalesOrder } from "@/types";

export function SaleDrawer({ sale: current, onClose }: { sale?: SalesOrder; onClose: () => void }) {
  const sale = useRetained(!!current, current);
  const router = useRouter();
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  const customers = useInventoryStore((s) => s.customers);
  const { confirmSale, fulfilSale, cancelSale } = useInventoryStore.getState();
  const [confirm, setConfirm] = useState<"fulfil" | "cancel" | null>(null);

  if (!sale) return null;
  const customer = selectPartyMap(customers).get(sale.customerId);
  const itemMap = selectItemMap(items);
  const levels = selectStockLevels(movements);
  const open = sale.status === "draft" || sale.status === "confirmed";
  const shortages = open
    ? [...qtyByItem(sale.lines)]
        .map(([itemId, qty]) => ({ item: itemMap.get(itemId), need: qty, have: levels.get(itemId) ?? 0 }))
        .filter((s) => s.have < s.need)
    : [];

  const steps: TimelineStep[] = [{ label: "Created", at: sale.createdAt, state: "done" }];
  if (sale.confirmedAt) steps.push({ label: "Confirmed", at: sale.confirmedAt, state: "done" });
  else if (sale.status === "draft") steps.push({ label: "Confirm", state: "current" });
  if (sale.status === "cancelled") steps.push({ label: "Cancelled", at: sale.cancelledAt, state: "cancelled" });
  else
    steps.push({
      label: sale.status === "fulfilled" ? "Fulfilled — stock shipped" : "Fulfil",
      at: sale.fulfilledAt,
      state: sale.status === "fulfilled" ? "done" : sale.status === "confirmed" ? "current" : "upcoming",
    });

  const fulfil = () => {
    const result = fulfilSale(sale.id);
    if (!result.ok) {
      toast.error(result.error, { description: result.details?.join(" · ") });
      return;
    }
    toast.success(`${sale.number} fulfilled`, {
      description: `${formatNumber(docUnits(sale.lines))} units shipped to ${customer?.name ?? "customer"}.`,
    });
    // Surface any item that this shipment pushed to or below its minimum level.
    const state = useInventoryStore.getState();
    const affected = new Set(sale.lines.map((l) => l.itemId));
    for (const item of selectItemsWithStock(state.items, state.movements)) {
      if (affected.has(item.id) && item.status !== "in_stock") {
        toast.warning(`${item.name} is ${item.status === "out" ? "out of stock" : "running low"}`, {
          description: `${formatNumber(item.quantity)} ${item.unit} left · minimum ${formatNumber(item.minLevel)}`,
          action: { label: "Create PO", onClick: () => router.push(`/purchases/new?item=${item.id}`) },
        });
      }
    }
  };

  const actions =
    sale.status === "draft" ? (
      <>
        <CancelButton onClick={() => setConfirm("cancel")} />
        <Button
          onClick={() => {
            const r = confirmSale(sale.id);
            if (r.ok) toast.success(`${sale.number} confirmed`, { description: "Ready to fulfil when stock is available." });
            else toast.error(r.error);
          }}
        >
          <CircleCheck /> Confirm sale
        </Button>
      </>
    ) : sale.status === "confirmed" ? (
      <>
        <CancelButton onClick={() => setConfirm("cancel")} />
        {/* With a shortage we call the action directly so the store's guard explains the block. */}
        <Button onClick={() => (shortages.length > 0 ? fulfil() : setConfirm("fulfil"))}>
          <PackageCheck /> Fulfil order
        </Button>
      </>
    ) : undefined;

  return (
    <>
      <DocumentDrawer
        open={!!current}
        onClose={onClose}
        number={sale.number}
        badge={<StatusBadge status={sale.status} />}
        partyLabel="to"
        partyName={customer?.name ?? "Unknown customer"}
        partyDetail={customer?.city}
        actions={actions}
      >
        <DocMeta
          entries={[
            { label: "Invoice date", value: formatDate(sale.date) },
            { label: "Contact", value: customer?.contactName ?? "—" },
            { label: "Fulfilled", value: sale.fulfilledAt ? formatDate(sale.fulfilledAt) : "—" },
          ]}
        />

        {shortages.length > 0 && (
          <div role="status" className="rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-danger-text">
              <TriangleExclamationPoint className="size-4" />
              Not enough stock to fulfil this order
            </div>
            <ul className="mt-2 space-y-1.5 pl-6 text-sm">
              {shortages.map(({ item, need, have }) => (
                <li key={item?.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-danger-text">
                    {item?.name}: need <span className="num font-medium">{formatNumber(need)}</span>, have{" "}
                    <span className="num font-medium">{formatNumber(have)}</span>
                  </span>
                  {item && (
                    <Link
                      href={`/purchases/new?item=${item.id}`}
                      className="rounded text-xs font-medium text-danger-text underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Create PO
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <SectionLabel>Items</SectionLabel>
          <DocLines lines={sale.lines} items={itemMap} availability={open ? levels : undefined} />
        </div>
        {sale.notes && (
          <div>
            <SectionLabel>Notes</SectionLabel>
            <p className="rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">{sale.notes}</p>
          </div>
        )}
        <div>
          <SectionLabel>Progress</SectionLabel>
          <DocTimeline steps={steps} />
        </div>
      </DocumentDrawer>

      <ConfirmDialog
        open={confirm === "fulfil"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Fulfil ${sale.number}?`}
        description={`${formatNumber(docUnits(sale.lines))} units across ${sale.lines.length} items will be deducted from stock and recorded in the ledger. Fulfilled invoices can't be cancelled.`}
        confirmLabel="Fulfil and ship"
        onConfirm={fulfil}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Cancel ${sale.number}?`}
        description="The invoice will be marked as cancelled. No stock has shipped, so the ledger is unchanged."
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        tone="danger"
        onConfirm={() => {
          const r = cancelSale(sale.id);
          if (r.ok) toast(`${sale.number} cancelled`);
          else toast.error(r.error);
        }}
      />
    </>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onClick}>
      Cancel invoice
    </Button>
  );
}
