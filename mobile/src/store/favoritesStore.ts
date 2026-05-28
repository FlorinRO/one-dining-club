import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FavoritesState = {
  restaurantIds: number[];
  productIds: number[];
  toggleRestaurant: (id: number) => void;
  isRestaurantFavorite: (id: number) => boolean;
  toggleProduct: (id: number) => void;
  isProductFavorite: (id: number) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      restaurantIds: [],
      productIds: [],
      toggleRestaurant: (id) =>
        set((state) => ({
          restaurantIds: state.restaurantIds.includes(id)
            ? state.restaurantIds.filter((currentId) => currentId !== id)
            : [...state.restaurantIds, id],
        })),
      isRestaurantFavorite: (id) => get().restaurantIds.includes(id),
      toggleProduct: (id) =>
        set((state) => ({
          productIds: state.productIds.includes(id)
            ? state.productIds.filter((currentId) => currentId !== id)
            : [...state.productIds, id],
        })),
      isProductFavorite: (id) => get().productIds.includes(id),
    }),
    {
      name: "favorites-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ restaurantIds: state.restaurantIds, productIds: state.productIds }),
    },
  ),
);
