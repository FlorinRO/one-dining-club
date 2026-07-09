import { CourierOrder } from "../types/models";

export function createMockCompletedOrders(currentUserId?: number): CourierOrder[] {
  const firstUpdatedAt = getRecentIsoDate(1, 2);
  const secondUpdatedAt = getRecentIsoDate(2, 5);

  return [
    {
      id: 9001,
      customer: 101,
      customer_name: "Andrei Popescu",
      customer_phone: "+40 721 000 101",
      restaurant: 201,
      restaurant_name: "YUMZY Bistro Unirii",
      courier: currentUserId ?? null,
      courier_name: "Curier demo",
      courier_vehicle_type: "scooter",
      address: 301,
      address_details: {
        id: 301,
        label: "Acasă",
        full_name: "Andrei Popescu",
        phone: "+40 721 000 101",
        address_line_1: "Bd. Unirii 21",
        address_line_2: "Sc. B, et. 4, ap. 18",
        city: "București",
        postcode: "030823",
      },
      address_summary: "Bd. Unirii 21, București",
      subtotal: "84.50",
      delivery_fee: "14.99",
      discount: "0.00",
      total: "99.49",
      fulfillment_type: "delivery",
      fulfillment_type_label: "Livrare",
      payment_method: "card",
      payment_method_label: "Card",
      payment_status: "paid",
      payment_status_label: "Plătită",
      order_status: "delivered",
      order_status_label: "Livrată",
      estimated_delivery_window_minutes: { min: 25, max: 35 },
      estimated_distance_km: 4.8,
      estimated_arrival_minutes: 28,
      delivery_status: "delivered",
      items: [
        {
          id: 401,
          product: 501,
          product_name: "Burger YUMZY",
          quantity: 2,
          unit_price: "32.00",
          total_price: "64.00",
        },
      ],
      created_at: getRecentIsoDate(1, 3),
      updated_at: firstUpdatedAt,
    },
    {
      id: 9002,
      customer: 102,
      customer_name: "Ioana Marinescu",
      customer_phone: "+40 722 000 102",
      restaurant: 202,
      restaurant_name: "Pasta Corner Dorobanți",
      courier: currentUserId ?? null,
      courier_name: "Curier demo",
      courier_vehicle_type: "bike",
      address: 302,
      address_details: {
        id: 302,
        label: "Birou",
        full_name: "Ioana Marinescu",
        phone: "+40 722 000 102",
        address_line_1: "Calea Dorobanți 135",
        address_line_2: "Recepție parter",
        city: "București",
        postcode: "010563",
      },
      address_summary: "Calea Dorobanți 135, București",
      subtotal: "62.00",
      delivery_fee: "12.50",
      discount: "5.00",
      total: "69.50",
      fulfillment_type: "delivery",
      fulfillment_type_label: "Livrare",
      payment_method: "apple_pay",
      payment_method_label: "Apple Pay",
      payment_status: "paid",
      payment_status_label: "Plătită",
      order_status: "delivered",
      order_status_label: "Livrată",
      estimated_delivery_window_minutes: { min: 20, max: 30 },
      estimated_distance_km: 3.2,
      estimated_arrival_minutes: 22,
      delivery_status: "delivered",
      items: [
        {
          id: 402,
          product: 502,
          product_name: "Tagliatelle al tartufo",
          quantity: 1,
          unit_price: "49.00",
          total_price: "49.00",
        },
      ],
      created_at: getRecentIsoDate(2, 6),
      updated_at: secondUpdatedAt,
    },
  ];
}

function getRecentIsoDate(daysAgo: number, hoursAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}
