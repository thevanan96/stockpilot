"use client";

import { selectLowStock } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { NavItem } from "@/lib/nav";

/** Live counters shown next to sidebar links (only after hydration, so SSR stays stable). */
export function useNavBadges(): Partial<Record<NonNullable<NavItem["badge"]>, number>> {
  const hydrated = useHydrated();
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  if (!hydrated) return {};
  return { lowStock: selectLowStock(items, movements).length };
}
