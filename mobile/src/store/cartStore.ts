import { create } from "zustand";

import { Product, ProductOption, Restaurant } from "../types/models";

export type CartItem = {
  id: string;
  product: Product;
  restaurant: Restaurant;
  quantity: number;
  selectedOptions: ProductOption[];
  ingredientPriceAdjustment?: number;
  notes?: string;
  mediaVideoUrl?: string | null;
};

type CartState = {
  restaurant: Restaurant | null;
  items: CartItem[];
  promoCode: string;
  setPromoCode: (code: string) => void;
  replaceCart: (payload: { restaurant: Restaurant; items: CartItem[]; promoCode?: string }) => void;
  addItem: (payload: {
    product: Product;
    restaurant: Restaurant;
    quantity?: number;
    selectedOptions?: ProductOption[];
    ingredientPriceAdjustment?: number;
    notes?: string;
    mediaVideoUrl?: string | null;
  }) => void;
  removeItem: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  clearCart: () => void;
  calculateSubtotal: () => number;
  calculateDeliveryFee: () => number;
  calculateDiscount: () => number;
  calculateTotal: () => number;
};

const price = (value: string | number | null | undefined) => Number(value ?? 0);

const itemKey = (product: Product, selectedOptions: ProductOption[], ingredientPriceAdjustment = 0, notes?: string) =>
  [
    product.id,
    ...selectedOptions.map((option) => option.id).sort((a, b) => a - b),
    ingredientPriceAdjustment ? `ingredientPrice=${ingredientPriceAdjustment.toFixed(2)}` : "",
    notes?.trim() ? `notes=${notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join(":");

const lineTotal = (item: CartItem) => {
  const unit = price(item.product.effective_price ?? item.product.discount_price ?? item.product.price);
  const options = item.selectedOptions.reduce((sum, option) => sum + price(option.extra_price), 0);
  const ingredientPriceAdjustment = price(item.ingredientPriceAdjustment);
  return (unit + options + ingredientPriceAdjustment) * item.quantity;
};

export const useCartStore = create<CartState>((set, get) => ({
  restaurant: null,
  items: [],
  promoCode: "",
  setPromoCode: (promoCode) => set({ promoCode }),
  replaceCart: ({ restaurant, items, promoCode = "" }) => set({ restaurant, items, promoCode }),
  addItem: ({ product, restaurant, quantity = 1, selectedOptions = [], ingredientPriceAdjustment = 0, notes, mediaVideoUrl }) => {
    const id = itemKey(product, selectedOptions, ingredientPriceAdjustment, notes);
    const currentRestaurant = get().restaurant;
    const currentItems = currentRestaurant?.id === restaurant.id ? get().items : [];
    const existing = currentItems.find((item) => item.id === id);

    if (existing) {
      set({
        restaurant,
        items: currentItems.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity, ingredientPriceAdjustment, notes, mediaVideoUrl } : item,
        ),
      });
      return;
    }

    set({
      restaurant,
      items: [...currentItems, { id, product, restaurant, quantity, selectedOptions, ingredientPriceAdjustment, notes, mediaVideoUrl }],
    });
  },
  removeItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    set({ items, restaurant: items.length ? get().restaurant : null });
  },
  increaseQuantity: (id) =>
    set({
      items: get().items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    }),
  decreaseQuantity: (id) => {
    const items = get()
      .items.map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0);
    set({ items, restaurant: items.length ? get().restaurant : null });
  },
  clearCart: () => set({ restaurant: null, items: [], promoCode: "" }),
  calculateSubtotal: () => get().items.reduce((sum, item) => sum + lineTotal(item), 0),
  calculateDeliveryFee: () => price(get().restaurant?.delivery_fee),
  calculateDiscount: () => {
    const subtotal = get().calculateSubtotal();
    return get().promoCode.trim().length ? Math.min(subtotal * 0.1, 25) : 0;
  },
  calculateTotal: () => get().calculateSubtotal() + get().calculateDeliveryFee() - get().calculateDiscount(),
}));
