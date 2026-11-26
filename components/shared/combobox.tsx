"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra text that is searchable and shown muted on the right (e.g. SKU, stock). */
  meta?: React.ReactNode;
  keywords?: string[];
  leading?: React.ReactNode;
  disabled?: boolean;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  invalid?: boolean;
  className?: string;
  contentClassName?: string;
}

/** Searchable select built on Popover + cmdk. */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText = "No matches.",
  invalid,
  className,
  contentClassName,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-left text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/15 dark:bg-input/30",
            className,
          )}
        >
          {selected?.leading}
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-subtle-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-subtle-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-(--radix-popover-trigger-width) min-w-72 p-0 shadow-overlay", contentClassName)}
      >
        {/* Plain substring match: predictable for names and SKUs. */}
        <Command filter={(value, search) => (value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="scrollbar-thin max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.keywords?.join(" ") ?? ""} ${o.value}`}
                  disabled={o.disabled}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  {o.leading}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.meta && <span className="shrink-0 text-xs text-muted-foreground">{o.meta}</span>}
                  <Check className={cn("size-3.5 shrink-0 text-primary", o.value === value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
