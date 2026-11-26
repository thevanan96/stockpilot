"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Package,
  Receipt,
  SlidersHorizontal,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { formatDelta, formatRelative } from "@/lib/format";
import type { ActivityEntry } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Item, Party, PurchaseOrder, SalesOrder } from "@/types";

interface Lookups {
  sales: Map<string, SalesOrder>;
  purchases: Map<string, PurchaseOrder>;
  customers: Map<string, Party>;
  suppliers: Map<string, Party>;
  items: Map<string, Item>;
}

interface Described {
  icon: LucideIcon;
  tone: string;
  title: React.ReactNode;
  detail?: string;
  href?: string;
  delta?: number;
}

const TONE = {
  success: "bg-success-soft text-success-text",
  brand: "bg-brand-soft text-brand-text",
  warning: "bg-warning-soft text-warning-text",
  neutral: "bg-muted text-muted-foreground",
};

const Ref = ({ children }: { children: React.ReactNode }) => <span className="font-mono text-[12.5px]">{children}</span>;

function describe(e: ActivityEntry, l: Lookups): Described {
  if (e.kind === "stock") {
    if (e.type === "purchase_receipt") {
      const po = l.purchases.get(e.ref.id);
      return {
        icon: ArrowDownLeft,
        tone: TONE.success,
        title: <>Received <Ref>{e.ref.number}</Ref></>,
        detail: `${l.suppliers.get(po?.supplierId ?? "")?.name ?? "Supplier"} · ${e.lines} ${e.lines === 1 ? "item" : "items"}`,
        href: `/purchases?po=${e.ref.id}`,
        delta: e.units,
      };
    }
    if (e.type === "sale_fulfilment") {
      const so = l.sales.get(e.ref.id);
      return {
        icon: ArrowUpRight,
        tone: TONE.brand,
        title: <>Fulfilled <Ref>{e.ref.number}</Ref></>,
        detail: `${l.customers.get(so?.customerId ?? "")?.name ?? "Customer"} · ${e.lines} ${e.lines === 1 ? "item" : "items"}`,
        href: `/sales?invoice=${e.ref.id}`,
        delta: e.units,
      };
    }
    const item = l.items.get(e.itemId);
    return {
      icon: SlidersHorizontal,
      tone: TONE.warning,
      title: <>Adjusted {item?.name ?? "item"}</>,
      detail: [e.ref.number, e.note].filter(Boolean).join(" · "),
      href: `/stock?item=${e.itemId}`,
      delta: e.units,
    };
  }

  const saleHref = `/sales?invoice=${e.refId}`;
  const poHref = `/purchases?po=${e.refId}`;
  const customer = l.customers.get(l.sales.get(e.refId)?.customerId ?? "")?.name;
  const supplier = l.suppliers.get(l.purchases.get(e.refId)?.supplierId ?? "")?.name;
  switch (e.type) {
    case "sale.created":
      return { icon: Receipt, tone: TONE.neutral, title: <>Created <Ref>{e.refNumber}</Ref></>, detail: customer, href: saleHref };
    case "sale.confirmed":
      return { icon: CircleCheck, tone: TONE.brand, title: <>Confirmed <Ref>{e.refNumber}</Ref></>, detail: customer, href: saleHref };
    case "sale.cancelled":
      return { icon: CircleX, tone: TONE.neutral, title: <>Cancelled <Ref>{e.refNumber}</Ref></>, detail: customer, href: saleHref };
    case "po.created":
      return { icon: Truck, tone: TONE.neutral, title: <>Raised <Ref>{e.refNumber}</Ref></>, detail: supplier, href: poHref };
    case "po.cancelled":
      return { icon: CircleX, tone: TONE.neutral, title: <>Cancelled <Ref>{e.refNumber}</Ref></>, detail: supplier, href: poHref };
    case "item.created":
      return {
        icon: Package,
        tone: TONE.neutral,
        title: <>Added item <Ref>{e.refNumber}</Ref></>,
        detail: l.items.get(e.refId)?.name,
        href: `/stock?item=${e.refId}`,
      };
  }
}

export function ActivityFeed({ entries, lookups }: { entries: ActivityEntry[]; lookups: Lookups }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-card" aria-labelledby="activity-title">
      <header className="px-5 pt-5 pb-3">
        <h2 id="activity-title" className="text-sm font-semibold">
          Recent activity
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Generated from the stock ledger and document events</p>
      </header>
      <ol className="border-t border-border">
        {entries.map((entry) => {
          const d = describe(entry, lookups);
          const Icon = d.icon;
          const body = (
            <>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", d.tone)}>
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{d.title}</span>
                {d.detail && <span className="block truncate text-xs text-muted-foreground">{d.detail}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                {d.delta !== undefined && (
                  <span className={cn("num text-xs font-semibold", d.delta > 0 ? "text-success-text" : "text-danger-text")}>
                    {formatDelta(d.delta)} units
                  </span>
                )}
                <time dateTime={entry.timestamp} className="num text-[11px] whitespace-nowrap text-subtle-foreground">
                  {formatRelative(entry.timestamp)}
                </time>
              </span>
            </>
          );
          return (
            <li key={entry.id} className="border-b border-border last:border-b-0">
              {d.href ? (
                <Link
                  href={d.href}
                  className="flex items-center gap-3 px-5 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      {entries.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity yet.</p>
      )}
    </section>
  );
}
