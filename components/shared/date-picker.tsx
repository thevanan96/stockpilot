"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types";

const triggerClass =
  "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-left text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-invalid:border-destructive dark:bg-input/30";

/** Single-date picker storing an ISO string. */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  invalid,
}: {
  id?: string;
  value?: string;
  onChange: (iso: string | undefined) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" data-invalid={invalid || undefined} className={triggerClass}>
          <CalendarDays className="size-4 text-subtle-foreground" />
          <span className={cn("num flex-1 truncate", !date && "text-subtle-foreground")}>
            {date ? formatDate(date) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 shadow-overlay">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(d) => {
            onChange(d ? withCurrentTime(d).toISOString() : undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Keep the time of day so same-day documents still sort sensibly. */
function withCurrentTime(d: Date) {
  const now = new Date();
  const out = new Date(d);
  out.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  return out;
}

export interface RangePreset {
  label: string;
  range: () => DateRange;
}

/** Date range picker with quick presets (used by reports). */
export function DateRangePicker({
  value,
  onChange,
  presets,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets: RangePreset[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>({ from: value.from, to: value.to });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft({ from: value.from, to: value.to });
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label="Choose date range" className={cn(triggerClass, "h-8 w-auto shadow-card", className)}>
          <CalendarDays className="size-4 text-subtle-foreground" />
          <span className="num whitespace-nowrap">
            {formatDate(value.from)} – {formatDate(value.to)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-auto flex-col p-0 shadow-overlay sm:flex-row">
        <div className="flex flex-row flex-wrap gap-1 border-b border-border p-2 sm:w-36 sm:flex-col sm:border-r sm:border-b-0">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onChange(p.range());
                setOpen(false);
              }}
              className="rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p.label}
            </button>
          ))}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          defaultMonth={value.to}
          onSelect={(r) => {
            setDraft(r);
            if (r?.from && r.to && r.from.getTime() !== r.to.getTime()) {
              onChange({ from: r.from, to: r.to });
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
