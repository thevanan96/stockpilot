import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemWithStock } from "@/types";

const BAR_TONE = { in_stock: "bg-success", low: "bg-warning", out: "bg-danger" } as const;

/** Quantity with unit and a tiny level gauge (full = 3× minimum level). */
export function StockLevel({ item, showBar = true }: { item: ItemWithStock; showBar?: boolean }) {
  const pct = Math.min(100, (item.quantity / Math.max(item.minLevel * 3, 1)) * 100);
  return (
    <span className="inline-flex items-center justify-end gap-3">
      {showBar && (
        <span
          className="hidden h-1 w-12 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset xl:block"
          aria-hidden
        >
          <span
            className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", BAR_TONE[item.status])}
            style={{ width: `${Math.max(pct, item.quantity > 0 ? 6 : 0)}%` }}
          />
        </span>
      )}
      <span className="num">
        <span className={cn("font-medium text-foreground", item.status === "out" && "text-danger-text")}>
          {formatNumber(item.quantity)}
        </span>
        <span className="ml-1 text-xs text-subtle-foreground">{item.unit}</span>
      </span>
    </span>
  );
}
