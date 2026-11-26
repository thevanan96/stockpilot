"use client";

import { selectItemsWithStock, selectLowStock } from "@/lib/selectors";
import { useInventoryStore } from "@/store/inventory-store";

/** Items joined with ledger-derived quantity and status. */
export function useItemsWithStock() {
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  return selectItemsWithStock(items, movements);
}

export function useLowStock() {
  const items = useInventoryStore((s) => s.items);
  const movements = useInventoryStore((s) => s.movements);
  return selectLowStock(items, movements);
}
