import { NavigatorScreenParams } from "@react-navigation/native";

import { Order, Product, Restaurant } from "../types/models";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  DeliveryAddress: { focusSearch?: boolean } | undefined;
  DeliveryAddressMap: undefined;
  Favorites: undefined;
  SectionRestaurants: { mode: "nearby" | "recommended"; title: string };
  RestaurantDetails: { restaurant: Restaurant; products?: Product[] };
  ProductDetails: { restaurant: Restaurant; product: Product };
  CartFlow: NavigatorScreenParams<CartStackParamList>;
};

export type SearchStackParamList = {
  SearchHome: { category?: string; openFilters?: boolean; focusSearch?: boolean } | undefined;
  RestaurantDetails: { restaurant: Restaurant; products?: Product[] };
  ProductDetails: { restaurant: Restaurant; product: Product };
};

export type CartStackParamList = {
  CartHome: undefined;
};

export type OrdersStackParamList = {
  OrdersHome: undefined;
  OrderDetails: { order: Order };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileSettings: undefined;
  ProfileEdit: { field: "name" | "phone" | "email" | "promo" };
  ProfileInfo: { topic: "privacy" | "about" | "support" };
};

export type MainTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList> | undefined;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
};
