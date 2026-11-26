"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value: number;
  format: (value: number) => string;
  /** Secondary line under the value. */
  detail: React.ReactNode;
  /** Percentage change, rendered as a trend chip. */
  trend?: number | null;
  trendLabel?: string;
  href: string;
}

export function KpiCard({ label, icon: Icon, value, format, detail, trend, trendLabel, href }: KpiCardProps) {
  const animated = useCountUp(value);
  return (
    <Link
      href={href}
      className="group relative flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5 transition-[border-color,box-shadow,transform] duration-200 outline-none hover:-translate-y-px hover:border-border-strong hover:shadow-[0_6px_20px_-8px_oklch(0.2_0.02_270/0.15)] focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border transition-colors group-hover:bg-brand-soft group-hover:text-brand-text group-hover:ring-primary/20">
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="num truncate text-xl leading-none font-semibold tracking-[-0.025em] sm:text-[26px]">
        <span aria-hidden>{format(Math.round(animated))}</span>
        <span className="sr-only">{format(value)}</span>
      </div>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              trend >= 0 ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text",
            )}
            title={trendLabel}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {formatPercent(trend)}
          </span>
        )}
        <span className="truncate">{detail}</span>
      </div>
    </Link>
  );
}
