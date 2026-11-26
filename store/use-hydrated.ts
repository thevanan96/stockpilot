"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useInventoryStore } from "@/store/inventory-store";

const subscribe = (onChange: () => void) => useInventoryStore.persist.onFinishHydration(onChange);

/** True once the persisted store has loaded from localStorage (always false on the server). */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => useInventoryStore.persist.hasHydrated(),
    () => false,
  );
}

/** Mount once near the root: loads persisted data after the first client render. */
export function StoreHydrator() {
  useEffect(() => {
    const { persist } = useInventoryStore;
    void Promise.resolve(persist.rehydrate()).then(() => {
      // First visit: write the freshly generated demo so it stays stable across reloads.
      if (localStorage.getItem(persist.getOptions().name ?? "") === null) useInventoryStore.setState({});
    });
  }, []);
  return null;
}
