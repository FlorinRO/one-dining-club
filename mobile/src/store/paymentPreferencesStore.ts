import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { PaymentMethod } from "../types/models";

type PaymentPreferencesState = {
  preferredPaymentMethod: PaymentMethod;
  setPreferredPaymentMethod: (method: PaymentMethod) => void;
};

export const usePaymentPreferencesStore = create<PaymentPreferencesState>()(
  persist(
    (set) => ({
      preferredPaymentMethod: "cash",
      setPreferredPaymentMethod: (preferredPaymentMethod) => set({ preferredPaymentMethod }),
    }),
    {
      name: "one-dining-payment-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
