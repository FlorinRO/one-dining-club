import { create } from "zustand";

import { Order } from "../types/models";

type OrdersState = {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
};

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set({ orders: [order, ...get().orders] }),
  updateOrder: (order) =>
    set({
      orders: get().orders.map((item) => (item.id === order.id ? order : item)),
    }),
}));
