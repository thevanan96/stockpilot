"use client";

import Link from "next/link";
import { ArrowRight, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemWithStock } from "@/types";

const MAX = 6;

export function LowStockCard({ items }: { items: ItemWithStock[] }) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-card" aria-labelledby="low-stock-title">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 id="low-stock-title" className="flex items-center gap-2 text-sm font-semibold">
            Low stock alerts
            {items.length > 0 && (
              <span className="num rounded-full bg-warning-soft px-1.5 py-px text-[11px] font-semibold text-warning-text">{items.length}</span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">At or below minimum level</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/stock">
            View stock <ArrowRight />
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={PackageCheck} title="Everything is stocked" description="No items are at or below their minimum level." className="py-10" />
      ) : (
        <ul className="flex-1 divide-y divide-border border-t border-border">
          {items.slice(0, MAX).map((item) => {
            const pct = Math.min(100, (item.quantity / Math.max(item.minLevel, 1)) * 100);
            return (
              <li key={item.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/stock?item=${item.id}`}
                    className="block truncate rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset" aria-hidden>
                      <span
                        className={cn("block h-full rounded-full", item.status === "out" ? "bg-danger" : "bg-warning")}
                        style={{ width: `${Math.max(pct, item.quantity > 0 ? 8 : 0)}%` }}
                      />
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} / {formatNumber(item.minLevel)} {item.unit}
                    </span>
                  </div>
                </div>
                <StatusBadge status={item.status} className="hidden sm:inline-flex xl:hidden 2xl:inline-flex" />
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/purchases/new?item=${item.id}`} aria-label={`Create purchase order for ${item.name}`}>
                    <Truck /> Create PO
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > MAX && (
        <Link
          href="/stock"
          className="border-t border-border px-5 py-2.5 text-center text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{items.length - MAX} more items need attention
        </Link>
      )}
    </section>
  );
}
