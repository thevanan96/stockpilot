import { cn } from "@/lib/utils";
import type { PurchaseStatus, SaleStatus, StockStatus } from "@/types";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "muted";

const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-muted text-foreground/80 ring-border", dot: "bg-subtle-foreground" },
  brand: { badge: "bg-brand-soft text-brand-text ring-primary/15", dot: "bg-primary" },
  success: { badge: "bg-success-soft text-success-text ring-success/20", dot: "bg-success" },
  warning: { badge: "bg-warning-soft text-warning-text ring-warning/25", dot: "bg-warning" },
  danger: { badge: "bg-danger-soft text-danger-text ring-danger/20", dot: "bg-danger" },
  muted: { badge: "bg-transparent text-muted-foreground ring-border", dot: "bg-subtle-foreground/60" },
};

type AnyStatus = StockStatus | SaleStatus | PurchaseStatus;

export const STATUS_META: Record<AnyStatus, { label: string; tone: Tone; short?: string }> = {
  in_stock: { label: "In stock", tone: "success" },
  low: { label: "Low", tone: "warning" },
  out: { label: "Out of stock", tone: "danger", short: "Out" },
  draft: { label: "Draft", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "brand" },
  fulfilled: { label: "Fulfilled", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  received: { label: "Received", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        t.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} aria-hidden />
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Pill tone={meta.tone} className={className}>
      {meta.short ? (
        <>
          <span className="sm:hidden">{meta.short}</span>
          <span className="hidden sm:inline">{meta.label}</span>
        </>
      ) : (
        meta.label
      )}
    </Pill>
  );
}
