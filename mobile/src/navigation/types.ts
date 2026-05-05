import { NavigatorScreenParams } from "@react-navigation/native";

import { Order, Product, Restaurant } from "../types/models";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Favorites: undefined;
  SectionRestaurants: { mode: "nearby" | "recommended"; title: string };
  RestaurantDetails: { restaurant: Restaurant };
  ProductDetails: { restaurant: Restaurant; product: Product };
  CartFlow: NavigatorScreenParams<CartStackParamList>;
};

export type CartStackParamList = {
  CartHome: undefined;
  Checkout: undefined;
  Address: undefined;
};

export type OrdersStackParamList = {
  OrdersHome: undefined;
  OrderDetails: { order: Order };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Address: undefined;
};

export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: { category?: string } | undefined;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
