export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

export type User = {
  id: number;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: UserRole;
  is_active?: boolean;
  last_login?: string | null;
  date_joined?: string;
};

export type CourierProfile = {
  id: number;
  full_name?: string;
  email?: string;
  member_since?: string;
  phone: string;
  vehicle_type: "bike" | "scooter" | "car" | "walk";
  current_latitude?: string | number | null;
  current_longitude?: string | number | null;
  is_available: boolean;
  is_verified: boolean;
  app_notifications_enabled: boolean;
  route_alerts_enabled: boolean;
  preferred_navigation_app: "google_maps" | "apple_maps" | "waze";
  app_language: "ro" | "en";
  rating_average?: string | number | null;
  rating_count: number;
  completed_deliveries_total: number;
  updated_at: string;
};

export type CourierOperationsSummary = {
  completed_today: number;
  completed_total: number;
  distance_today_km: number;
  distance_total_km: number;
  average_eta_minutes: number | null;
  earnings_today: string | number;
  available_balance: string | number;
  earnings_this_week: string | number;
  earnings_this_month: string | number;
  online_minutes_today: number;
  recent_deliveries: CourierCompletedDelivery[];
  generated_at: string;
};

export type CourierOperationEntry = {
  id: number;
  source: "simulation";
  reference_id: string;
  completed_at: string;
  delivery_fee: string | number;
  distance_km: string | number;
  duration_minutes?: number | null;
  metadata?: Record<string, unknown>;
};

export type CourierDocument = {
  id: number | null;
  document_type: "id_card" | "driving_license" | "vehicle_registration" | "insurance";
  document_type_label: string;
  status: "missing" | "pending" | "approved" | "rejected";
  status_label: string;
  file_name: string;
  review_note: string;
  expires_at?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
};

export type CourierHelpArticle = {
  id: string;
  title: string;
  body: string;
};

export type CourierHelpCenter = {
  support_email: string;
  articles: CourierHelpArticle[];
};

export type CourierSupportTicket = {
  id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  status_label: string;
  created_at: string;
  updated_at: string;
};

export type CourierCompletedDelivery = {
  id: string;
  source: "order" | "simulation";
  order_id?: number | null;
  operation_entry_id?: number | null;
  reference_id: string;
  completed_at: string;
  delivery_fee: string | number;
  distance_km: number;
  duration_minutes?: number | null;
  restaurant_name: string;
  dropoff_address: string;
  customer_name: string;
  payment_method_label: string;
  total: string | number;
  status: OrderStatus;
  status_label: string;
  items: OrderItem[];
  metadata?: Record<string, unknown>;
  order?: CourierOrder | null;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled"
  | "rejected";

export type CourierDeliveryStatus = "assigned" | "picked_up" | "on_the_way" | "delivered" | "cancelled" | "";

export type Address = {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postcode?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  instructions?: string;
  is_default?: boolean;
};

export type OrderItem = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  notes?: string;
  options?: Array<{ id: number; option_name: string; extra_price: string | number }>;
};

export type CourierOrder = {
  id: number;
  customer: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  restaurant: number;
  restaurant_name: string;
  courier?: number | null;
  courier_name?: string;
  courier_phone?: string;
  courier_vehicle_type?: string;
  address?: number | null;
  address_details?: Address | null;
  address_summary: string;
  subtotal: string | number;
  delivery_fee: string | number;
  discount: string | number;
  total: string | number;
  fulfillment_type: "delivery" | "pickup";
  fulfillment_type_label?: string;
  payment_method: "cash" | "card" | "apple_pay" | "google_pay";
  payment_method_label?: string;
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  payment_status_label?: string;
  order_status: OrderStatus;
  order_status_label?: string;
  customer_note?: string;
  restaurant_note?: string;
  estimated_delivery_window_minutes?: { min: number; max: number } | null;
  estimated_distance_km?: number | null;
  estimated_arrival_minutes?: number | null;
  delivery_status: CourierDeliveryStatus;
  pickup_time?: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};
