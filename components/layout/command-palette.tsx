"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Package, Plus, Receipt, Sun, Truck } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/shared/status-badge";
import { NAV_SECTIONS } from "@/lib/nav";
import { selectItemsWithStock, selectPartyMap } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import { useUiStore } from "@/store/ui-store";

const QUICK_ACTIONS = [
  { label: "New sale", href: "/sales/new", icon: Receipt },
  { label: "New purchase order", href: "/purchases/new", icon: Truck },
];

/** Ctrl/⌘ K: jump to pages, items and documents, or run quick actions. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Search pages, items and documents">
      <CommandInput placeholder="Search pages, items, invoices, POs…" />
      <CommandList className="scrollbar-thin max-h-[min(420px,60dvh)]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem key={a.href} onSelect={() => go(a.href)}>
              <Plus />
              {a.label}
            </CommandItem>
          ))}
          <CommandItem
            onSelect={() => {
              setOpen(false);
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {open && <DataResults onSelect={go} />}
      </CommandList>
    </CommandDialog>
  );
}

/** Items and documents; only mounted while the palette is open. */
function DataResults({ onSelect }: { onSelect: (href: string) => void }) {
  const hydrated = useHydrated();
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  const sales = useInventoryStore((s) => s.sales);
  const purchases = useInventoryStore((s) => s.purchases);
  const customers = useInventoryStore((s) => s.customers);
  const suppliers = useInventoryStore((s) => s.suppliers);
  if (!hydrated) return null;

  const customerMap = selectPartyMap(customers);
  const supplierMap = selectPartyMap(suppliers);
  const recent = <T extends { date: string }>(docs: T[]) => [...docs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <CommandSeparator />
      <CommandGroup heading="Items">
        {selectItemsWithStock(items, movements).map((i) => (
          <CommandItem key={i.id} value={`item ${i.name} ${i.sku}`} onSelect={() => onSelect(`/stock?item=${i.id}`)}>
            <Package />
            <span className="min-w-0 flex-1 truncate">{i.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{i.sku}</span>
            {i.status !== "in_stock" && <StatusBadge status={i.status} />}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="Invoices">
        {recent(sales).map((s) => {
          const name = customerMap.get(s.customerId)?.name ?? "";
          return (
            <CommandItem key={s.id} value={`invoice ${s.number} ${name}`} onSelect={() => onSelect(`/sales?invoice=${s.id}`)}>
              <Receipt />
              <span className="font-mono text-[13px]">{s.number}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{name}</span>
              <StatusBadge status={s.status} />
            </CommandItem>
          );
        })}
      </CommandGroup>
      <CommandGroup heading="Purchase orders">
        {recent(purchases).map((p) => {
          const name = supplierMap.get(p.supplierId)?.name ?? "";
          return (
            <CommandItem key={p.id} value={`po ${p.number} ${name}`} onSelect={() => onSelect(`/purchases?po=${p.id}`)}>
              <Truck />
              <span className="font-mono text-[13px]">{p.number}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{name}</span>
              <StatusBadge status={p.status} />
            </CommandItem>
          );
        })}
      </CommandGroup>
    </>
  );
}
