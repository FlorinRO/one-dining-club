export type RootStackParamList = {
  Auth: undefined;
  AppTabs: undefined;
  OrderDetails: { orderId: number };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabParamList = {
  Available: undefined;
  Operations: undefined;
  Deliveries: undefined;
  Profile: undefined;
};
