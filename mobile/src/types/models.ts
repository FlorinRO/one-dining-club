export type UserRole = "customer" | "restaurant_owner" | "courier" | "admin";

export type User = {
  id: number;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: UserRole;
  date_joined?: string;
};

export type RestaurantCategory = {
  id: number;
  name: string;
  icon?: string;
};

export type Restaurant = {
  id: number;
  name: string;
  slug: string;
  entity_type?: "restaurant" | "brand";
  is_sponsored?: boolean;
  sponsored_mode?: "native" | "external";
  website_url?: string | null;
  description: string;
  logo?: string | null;
  cover_image?: string | null;
  city: string;
  address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  delivery_fee: string | number;
  minimum_order: string | number;
  estimated_delivery_time_min: number;
  estimated_delivery_time_max: number;
  rating: string | number;
  reviews_count?: number;
  has_offer?: boolean;
  supports_pickup?: boolean;
  distance_km?: number;
  is_open: boolean;
  categories?: RestaurantCategory[];
};

export type ProductCategory = {
  id: number;
  restaurant: number;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type ProductOption = {
  id: number;
  name: string;
  extra_price: string | number;
  is_available: boolean;
};

export type ProductOptionGroup = {
  id: number;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: ProductOption[];
};

export type Product = {
  id: number;
  restaurant: number;
  restaurant_name?: string;
  external_url?: string | null;
  category?: number | null;
  category_name?: string;
  name: string;
  description: string;
  image?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  has_audio?: boolean;
  price: string | number;
  discount_price?: string | number | null;
  effective_price?: string | number;
  is_available: boolean;
  is_popular: boolean;
  preparation_time: number;
  allergens?: string;
  ingredients?: string;
  calories?: number;
  option_groups?: ProductOptionGroup[];
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
};

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
  is_default: boolean;
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

export type PaymentMethod = "cash" | "card" | "apple_pay" | "google_pay";
export type FulfillmentType = "delivery" | "pickup";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export type Order = {
  id: number;
  restaurant: number;
  restaurant_name: string;
  subtotal: string | number;
  delivery_fee: string | number;
  discount: string | number;
  total: string | number;
  fulfillment_type?: FulfillmentType;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
  items: Array<{
    id: number;
    product: number;
    product_name: string;
    product_image?: string | null;
    product_video_url?: string | null;
    quantity: number;
    unit_price: string | number;
    total_price: string | number;
    notes?: string;
    options?: Array<{ id: number; option_name: string; extra_price: string | number }>;
  }>;
  address?: Address | number;
  review?: Review | null;
};

export type ProductComment = {
  id: number;
  product: number;
  parent?: number | null;
  author: string;
  text: string;
  photo_urls?: string[];
  likes_count: number;
  is_liked: boolean;
  replies?: ProductComment[];
  created_at: string;
  updated_at?: string;
};

export type ProductSocialSummary = {
  id: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
};

export type ProductCommentLikeSummary = {
  id: number;
  likes_count: number;
  is_liked: boolean;
};

export type Review = {
  id: number;
  customer: number;
  customer_name?: string;
  restaurant: number;
  restaurant_name?: string;
  order: number;
  rating: number;
  comment?: string;
  created_at: string;
};
