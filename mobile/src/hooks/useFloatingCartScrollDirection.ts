import { useCallback, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useUiStore } from "../store/uiStore";

const EXPAND_DELTA_THRESHOLD = -3;
const COLLAPSE_DELTA_THRESHOLD = 3;

export function useFloatingCartScrollDirection() {
  const setFloatingCartExpanded = useUiStore((state) => state.setFloatingCartExpanded);
  const lastScrollY = useRef(0);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = currentY - lastScrollY.current;

      if (delta <= EXPAND_DELTA_THRESHOLD) {
        setFloatingCartExpanded(true);
      } else if (delta >= COLLAPSE_DELTA_THRESHOLD) {
        setFloatingCartExpanded(false);
      }

      lastScrollY.current = currentY;
    },
    [setFloatingCartExpanded],
  );
}
