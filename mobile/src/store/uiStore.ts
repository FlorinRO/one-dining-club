import { create } from "zustand";

type UiState = {
  floatingCartExpanded: boolean;
  setFloatingCartExpanded: (expanded: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  floatingCartExpanded: false,
  setFloatingCartExpanded: (floatingCartExpanded) => set({ floatingCartExpanded }),
}));
