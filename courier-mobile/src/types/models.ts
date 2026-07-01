export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

export type User = {
  id: number;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: UserRole;
};

export type CourierProfile = {
  id: number;
  full_name?: string;
  email?: string;
  phone: string;
  vehicle_type: "bike" | "scooter" | "car" | "walk";
  current_latitude?: string | number | null;
  current_longitude?: string | number | null;
  is_available: boolean;
  is_verified: boolean;
  updated_at: string;
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
