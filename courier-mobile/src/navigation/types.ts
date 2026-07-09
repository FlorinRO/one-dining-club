export type RootStackParamList = {
  Auth: undefined;
  AppTabs: undefined;
  OrderDetails: { orderId: number };
  CompletedDeliveryDetails: { deliveryId: string };
  ProfilePersonal: undefined;
  ProfileEarnings: undefined;
  ProfileVehicle: undefined;
  ProfileDocuments: undefined;
  ProfileSettings: undefined;
  ProfileSecurity: undefined;
  ProfileHelpCenter: undefined;
  ProfileSupport: undefined;
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
