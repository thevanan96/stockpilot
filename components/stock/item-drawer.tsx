"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Flag, Pencil, SlidersHorizontal, TriangleExclamationPoint, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { suggestedReorderQty } from "@/lib/domain";
import { formatDateTime, formatDelta, formatINR, formatNumber } from "@/lib/format";
import { selectItemHistory, type HistoryRow } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { cn, ignoreToastInteractions } from "@/lib/utils";
import type { ItemWithStock, MovementType } from "@/types";
import { useRetained } from "@/hooks/use-retained";

interface ItemDrawerProps {
  item: ItemWithStock | undefined;
  onClose: () => void;
  onEdit: (item: ItemWithStock) => void;
  onAdjust: (item: ItemWithStock) => void;
}

export function ItemDrawer({ item: current, onClose, onEdit, onAdjust }: ItemDrawerProps) {
  const item = useRetained(!!current, current);
  return (
    <Sheet open={!!current} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
        onInteractOutside={ignoreToastInteractions}
      >
        {item && <ItemDetail item={item} onEdit={onEdit} onAdjust={onAdjust} />}
      </SheetContent>
    </Sheet>
  );
}

function ItemDetail({ item, onEdit, onAdjust }: Omit<ItemDrawerProps, "item" | "onClose"> & { item: ItemWithStock }) {
  const movements = useInventoryStore((s) => s.movements);
  const supplier = useInventoryStore((s) => s.suppliers.find((x) => x.id === item.preferredSupplierId));
  const history = selectItemHistory(item.id, movements);
  const margin = item.sellPrice > 0 ? ((item.sellPrice - item.costPrice) / item.sellPrice) * 100 : 0;
  const needsReorder = item.status !== "in_stock";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{item.sku}</span>
              <span aria-hidden>·</span>
              <span>{item.category}</span>
            </div>
            <SheetTitle className="text-lg leading-6 font-semibold tracking-[-0.015em]">{item.name}</SheetTitle>
            <SheetDescription className="sr-only">Stock details and movement history</SheetDescription>
            <StatusBadge status={item.status} />
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </SheetClose>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant={needsReorder ? "outline" : "default"} size="sm" onClick={() => onAdjust(item)}>
            <SlidersHorizontal /> Adjust stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
            <Pencil /> Edit
          </Button>
          <Button variant={needsReorder ? "default" : "outline"} size="sm" asChild>
            <Link href={`/purchases/new?item=${item.id}`}>
              <Truck /> Create PO
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-slim">
        <dl className="grid grid-cols-2 gap-px border-b border-border bg-border">
          <Stat label="On hand" value={formatNumber(item.quantity)} suffix={item.unit} emphasis />
          <Stat label="Minimum level" value={formatNumber(item.minLevel)} suffix={item.unit} />
          <Stat label="Stock value" value={formatINR(item.stockValue)} hint="at cost" />
          <Stat
            label="Cost / sell"
            value={`${formatINR(item.costPrice)} / ${formatINR(item.sellPrice)}`}
            hint={`${margin.toFixed(0)}% margin`}
          />
        </dl>

        {needsReorder && (
          <div className="mx-5 mt-5 flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm">
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warning-text" />
            <p className="text-warning-text">
              <span className="font-medium">{item.status === "out" ? "Out of stock." : "Below minimum level."}</span>{" "}
              Suggested reorder: {formatNumber(suggestedReorderQty(item.quantity, item.minLevel))} {item.unit}
              {supplier ? ` from ${supplier.name}` : ""}.
            </p>
          </div>
        )}

        <section className="px-5 py-5" aria-labelledby="history-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 id="history-heading" className="text-sm font-semibold">
              Stock history
            </h3>
            <span className="num text-xs text-muted-foreground">{history.length} movements</span>
          </div>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No movements yet. Receive a purchase order or record an adjustment.
            </p>
          ) : (
            <ol className="relative space-y-1">
              {history.map((row, i) => (
                <HistoryItem key={row.id} row={row} unit={item.unit} last={i === history.length - 1} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, hint, emphasis }: { label: string; value: string; suffix?: string; hint?: string; emphasis?: boolean }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-1 flex items-baseline gap-1">
        <span className={cn("font-semibold tracking-[-0.01em]", emphasis ? "text-xl" : "text-[15px]")}>{value}</span>
        {suffix && <span className="text-xs text-subtle-foreground">{suffix}</span>}
        {hint && <span className="ml-1 text-xs text-subtle-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

const MOVEMENT_META: Record<MovementType, { label: string; icon: typeof Flag; className: string }> = {
  opening: { label: "Opening balance", icon: Flag, className: "bg-muted text-muted-foreground" },
  purchase_receipt: { label: "Received", icon: ArrowDownLeft, className: "bg-success-soft text-success-text" },
  sale_fulfilment: { label: "Shipped", icon: ArrowUpRight, className: "bg-brand-soft text-brand-text" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, className: "bg-warning-soft text-warning-text" },
};

function docHref(ref: HistoryRow["refDoc"]) {
  if (ref.kind === "PO") return `/purchases?po=${ref.id}`;
  if (ref.kind === "SO") return `/sales?invoice=${ref.id}`;
  return null;
}

function HistoryItem({ row, unit, last }: { row: HistoryRow; unit: string; last: boolean }) {
  const meta = MOVEMENT_META[row.type];
  const Icon = meta.icon;
  const href = docHref(row.refDoc);
  return (
    <li className="relative flex gap-3 py-2">
      {!last && <span className="absolute top-10 bottom-[-6px] left-[13px] w-px bg-border" aria-hidden />}
      <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card", meta.className)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium">{meta.label}</span>
          {href ? (
            <Link href={href} className="rounded font-mono text-xs text-brand-text underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              {row.refDoc.number}
            </Link>
          ) : (
            row.refDoc.kind === "ADJ" && <span className="font-mono text-xs text-muted-foreground">{row.refDoc.number}</span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {formatDateTime(row.timestamp)}
          {row.note && row.type !== "opening" ? ` · ${row.note}` : ""}
        </div>
      </div>
      <div className="num shrink-0 text-right">
        <div className={cn("text-sm font-semibold", row.qtyDelta > 0 ? "text-success-text" : "text-danger-text")}>
          {formatDelta(row.qtyDelta)}
        </div>
        <div className="text-xs text-subtle-foreground">
          {formatNumber(row.balance)} {unit}
        </div>
      </div>
    </li>
  );
}
