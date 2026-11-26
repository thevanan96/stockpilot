"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pill, StatusBadge } from "@/components/shared/status-badge";
import { DocLines, DocMeta, DocTimeline, DocumentDrawer, SectionLabel, type TimelineStep } from "@/components/documents/doc-parts";
import { docUnits } from "@/lib/domain";
import { formatDate, plural } from "@/lib/format";
import { selectItemMap, selectPartyMap } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useRetained } from "@/hooks/use-retained";
import type { PurchaseOrder } from "@/types";

export function PurchaseDrawer({ purchase: current, onClose }: { purchase?: PurchaseOrder; onClose: () => void }) {
  const purchase = useRetained(!!current, current);
  const router = useRouter();
  const items = useInventoryStore((s) => s.items);
  const suppliers = useInventoryStore((s) => s.suppliers);
  const receivePurchase = useInventoryStore((s) => s.receivePurchase);
  const cancelPurchase = useInventoryStore((s) => s.cancelPurchase);
  const [confirm, setConfirm] = useState<"receive" | "cancel" | null>(null);

  if (!purchase) return null;
  const supplier = selectPartyMap(suppliers).get(purchase.supplierId);
  const units = docUnits(purchase.lines);
  const overdueDays =
    purchase.status === "pending" && purchase.expectedDate
      ? differenceInCalendarDays(new Date(), new Date(purchase.expectedDate))
      : 0;

  const steps: TimelineStep[] = [
    { label: "Order placed", at: purchase.createdAt, state: "done" },
    purchase.status === "cancelled"
      ? { label: "Cancelled", at: purchase.cancelledAt, state: "cancelled" }
      : {
          label: purchase.status === "received" ? "Received into stock" : "Awaiting delivery",
          at: purchase.receivedAt,
          state: purchase.status === "received" ? "done" : "current",
        },
  ];

  const receive = () => {
    const result = receivePurchase(purchase.id);
    if (!result.ok) return toast.error(result.error);
    toast.success(`${purchase.number} received`, {
      description: `+${plural(units, "unit")} added to stock across ${plural(purchase.lines.length, "item")}.`,
      action: { label: "View stock", onClick: () => router.push("/stock") },
      duration: 8000,
    });
  };
  const cancel = () => {
    const result = cancelPurchase(purchase.id);
    if (!result.ok) return toast.error(result.error);
    toast(`${purchase.number} cancelled`);
  };

  return (
    <>
      <DocumentDrawer
        open={!!current}
        onClose={onClose}
        number={purchase.number}
        badge={<StatusBadge status={purchase.status} />}
        partyLabel="from"
        partyName={supplier?.name ?? "Unknown supplier"}
        partyDetail={supplier?.city}
        actions={
          purchase.status === "pending" ? (
            <>
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirm("cancel")}>
                Cancel PO
              </Button>
              <Button onClick={() => setConfirm("receive")}>
                <PackageCheck /> Mark as received
              </Button>
            </>
          ) : undefined
        }
      >
        <DocMeta
          entries={[
            { label: "Order date", value: formatDate(purchase.date) },
            {
              label: "Expected",
              value: purchase.expectedDate ? (
                <span className="flex items-center gap-2">
                  {formatDate(purchase.expectedDate)}
                  {overdueDays > 0 && <Pill tone="danger">{overdueDays}d late</Pill>}
                </span>
              ) : (
                "—"
              ),
            },
            { label: "Received", value: purchase.receivedAt ? formatDate(purchase.receivedAt) : "—" },
          ]}
        />
        <div>
          <SectionLabel>Items</SectionLabel>
          <DocLines lines={purchase.lines} items={selectItemMap(items)} />
        </div>
        {purchase.notes && (
          <div>
            <SectionLabel>Notes</SectionLabel>
            <p className="rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">{purchase.notes}</p>
          </div>
        )}
        <div>
          <SectionLabel>Progress</SectionLabel>
          <DocTimeline steps={steps} />
        </div>
      </DocumentDrawer>

      <ConfirmDialog
        open={confirm === "receive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Receive ${purchase.number}?`}
        description={`This adds ${plural(units, "unit")} across ${plural(purchase.lines.length, "item")} to stock and records each line in the stock ledger. A PO can only be received once.`}
        confirmLabel="Receive into stock"
        onConfirm={receive}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Cancel ${purchase.number}?`}
        description="The order will be marked as cancelled. No stock has been received, so nothing in the ledger changes."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        onConfirm={cancel}
      />
    </>
  );
}
