"use client";

import { Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2.5 lg:flex-row lg:items-center", className)}>{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full lg:w-72", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 w-full rounded-lg border border-input bg-card pr-8 pl-8 text-sm shadow-card transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-subtle-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  count?: number;
}

/** Tab-like status filter with live counts. */
export function SegmentedFilter<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (value: V) => void;
  options: SegmentOption<V>[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="scrollbar-thin flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5 ring-1 ring-border ring-inset"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              active && "bg-card text-foreground shadow-card ring-1 ring-border",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("num text-xs text-subtle-foreground", active && "text-muted-foreground")}>
                {formatNumber(o.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SelectFilter<V extends string>({
  value,
  onChange,
  options,
  label,
  allLabel,
  className,
}: {
  value: V | "all";
  onChange: (value: V | "all") => void;
  options: { value: V; label: string }[];
  label: string;
  allLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as V | "all")}>
      <SelectTrigger aria-label={label} className={cn("w-full bg-card shadow-card lg:w-48", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
