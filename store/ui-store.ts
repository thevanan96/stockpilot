import { create } from "zustand";

interface UiState {
  commandOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

/** Ephemeral UI chrome state (not persisted). */
export const useUiStore = create<UiState>()((set) => ({
  commandOpen: false,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
