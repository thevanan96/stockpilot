"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { docTotal, docUnits } from "@/lib/domain";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { cn, ignoreToastInteractions } from "@/lib/utils";
import type { Item, LineItem } from "@/types";

/* ------------------------------ Drawer shell ------------------------------ */

export function DocumentDrawer({
  open,
  onClose,
  number,
  badge,
  partyLabel,
  partyName,
  partyDetail,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  number: string;
  badge: React.ReactNode;
  partyLabel: string;
  partyName: string;
  partyDetail?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]"
        onInteractOutside={ignoreToastInteractions}
      >
        <div className="border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2.5">
                <SheetTitle className="font-mono text-lg font-semibold tracking-tight">{number}</SheetTitle>
                {badge}
              </div>
              <SheetDescription asChild>
                <div className="flex items-center gap-2.5 text-sm">
                  <EntityAvatar name={partyName} size="xs" />
                  <span className="text-muted-foreground">{partyLabel}</span>
                  <span className="truncate font-medium text-foreground">{partyName}</span>
                  {partyDetail && <span className="hidden text-subtle-foreground sm:inline">· {partyDetail}</span>}
                </div>
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </SheetClose>
          </div>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 scrollbar-thin">{children}</div>
        {actions && (
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3.5 sm:flex-row sm:justify-end">
            {actions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------ Meta grid ------------------------------ */

export function DocMeta({ entries }: { entries: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {entries.map((e) => (
        <div key={e.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{e.label}</dt>
          <dd className="num mt-0.5 truncate text-sm font-medium">{e.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------ Lines table ------------------------------ */

export function DocLines({
  lines,
  items,
  availability,
}: {
  lines: LineItem[];
  items: Map<string, Item>;
  /** Optional on-hand quantities, shown per line (used before fulfilment). */
  availability?: Map<string, number>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3.5 py-2 text-left font-medium">Item</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Price</th>
            <th scope="col" className="px-3.5 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => {
            const item = items.get(l.itemId);
            const onHand = availability?.get(l.itemId);
            const short = onHand !== undefined && onHand < l.qty;
            return (
              <tr key={l.itemId}>
                <td className="px-3.5 py-2.5">
                  <div className="font-medium">{item?.name ?? "Removed item"}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{item?.sku}</span>
                    {onHand !== undefined && (
                      <span className={cn("num ml-2", short ? "font-medium text-danger-text" : "text-subtle-foreground")}>
                        {formatNumber(onHand)} on hand
                      </span>
                    )}
                  </div>
                </td>
                <td className="num px-3 py-2.5 text-right">{formatNumber(l.qty)}</td>
                <td className="num hidden px-3 py-2.5 text-right text-muted-foreground sm:table-cell">{formatINR(l.unitPrice)}</td>
                <td className="num px-3.5 py-2.5 text-right font-medium">{formatINR(l.qty * l.unitPrice)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-border bg-muted/30">
          <tr>
            <td className="px-3.5 py-3 text-xs text-muted-foreground">
              {lines.length} {lines.length === 1 ? "line" : "lines"} · {formatNumber(docUnits(lines))} units
            </td>
            <td colSpan={3} className="num px-3.5 py-3 text-right">
              <span className="mr-3 text-xs text-muted-foreground">Total</span>
              <span className="text-base font-semibold tracking-tight">{formatINR(docTotal(lines))}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ------------------------------ Timeline ------------------------------ */

export interface TimelineStep {
  label: string;
  at?: string;
  state: "done" | "current" | "upcoming" | "cancelled";
}

export function DocTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn("absolute top-5 bottom-0 left-[9px] w-px", s.state === "done" ? "bg-success/40" : "bg-border")}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full ring-4 ring-popover",
              s.state === "done" && "bg-success text-white",
              s.state === "current" && "border-2 border-primary bg-popover",
              s.state === "upcoming" && "border border-dashed border-border-strong bg-popover",
              s.state === "cancelled" && "bg-muted-foreground/70 text-white",
            )}
          >
            {s.state === "done" && <Check className="size-3" strokeWidth={3} />}
            {s.state === "cancelled" && <X className="size-3" strokeWidth={3} />}
            {s.state === "current" && <span className="size-1.5 rounded-full bg-primary" />}
          </span>
          <div className="min-w-0">
            <div className={cn("text-sm font-medium", s.state === "upcoming" && "text-muted-foreground")}>{s.label}</div>
            {s.at && <div className="num text-xs text-muted-foreground">{formatDateTime(s.at)}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h3>;
}
