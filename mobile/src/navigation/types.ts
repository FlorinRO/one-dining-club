import { NavigatorScreenParams } from "@react-navigation/native";

import { Order, Product, Restaurant } from "../types/models";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  RestaurantDetails: { restaurant: Restaurant };
  ProductDetails: { restaurant: Restaurant; product: Product };
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
  SearchTab: undefined;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

