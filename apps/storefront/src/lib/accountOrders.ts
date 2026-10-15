import type { CustomerStatus } from './orderStatus';

/** Un pedido tal como lo devuelve GET /store/customers/me/orders. */
export interface CustomerOrderResponse {
  id: string;
  display_id: number;
  customer_status: CustomerStatus;
  created_at: string;
  total: number;
  currency_code: string;
  fulfillments?: {
    labels?: { tracking_number?: string | null; tracking_url?: string | null }[] | null;
  }[];
  items?: {
    id: string;
    title?: string | null;
    variant_title?: string | null;
    quantity: number;
    unit_price: number;
    thumbnail?: string | null;
  }[];
  shipping_address?: {
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    province?: string | null;
  } | null;
}

export interface UserOrderItem {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  thumbnail: string | null;
}

export interface UserOrderAddress {
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
}

export interface UserOrder {
  id: string;
  displayId: string;
  createdAt: string;
  status: CustomerStatus;
  total: number;
  currencyCode: string;
  trackingCodes: string[];
  items: UserOrderItem[];
  shippingAddress: UserOrderAddress | null;
}

export function mapCustomerOrder(order: CustomerOrderResponse): UserOrder {
  const trackingCodes = (order.fulfillments ?? [])
    .flatMap((f) => f.labels ?? [])
    .map((label) => label.tracking_number)
    .filter((n): n is string => !!n);

  const address = order.shipping_address;

  return {
    id: order.id,
    displayId: String(order.display_id),
    createdAt: order.created_at,
    status: order.customer_status,
    total: order.total,
    currencyCode: order.currency_code,
    trackingCodes,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      title: item.title ?? 'Producto',
      variantTitle: item.variant_title ?? '',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      thumbnail: item.thumbnail ?? null,
    })),
    shippingAddress: address
      ? {
          address_1: address.address_1 ?? '',
          address_2: address.address_2 ?? undefined,
          city: address.city ?? '',
          province: address.province ?? '',
        }
      : null,
  };
}
