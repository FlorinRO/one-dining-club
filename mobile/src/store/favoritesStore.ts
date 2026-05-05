import { create } from "zustand";

type FavoritesState = {
  restaurantIds: number[];
  toggleRestaurant: (id: number) => void;
  isRestaurantFavorite: (id: number) => boolean;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  restaurantIds: [],
  toggleRestaurant: (id) =>
    set((state) => ({
      restaurantIds: state.restaurantIds.includes(id)
        ? state.restaurantIds.filter((currentId) => currentId !== id)
        : [...state.restaurantIds, id],
    })),
  isRestaurantFavorite: (id) => get().restaurantIds.includes(id),
}));
