/**
 * Core Ecommerce Types conforming to Medusa 2.x Store API specifications
 */

export interface ProductOptionValue {
  id: string;
  value: string;
}

export interface ProductOption {
  id: string;
  title: string; // e.g. "Sabor", "Tamaño"
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  barcode?: string;
  price: number; // in minor units or whole CLP
  original_price?: number;
  currency_code: string;
  inventory_quantity: number;
  manage_inventory: boolean;
  allow_backorder: boolean;
  weight: number; // in grams
  options: Record<string, string>; // e.g. { "Sabor": "Chocolate Suizo", "Tamaño": "2 kg" }
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface ProductCategory {
  id: string;
  name: string;
  handle: string;
  description?: string;
  parent_category_id?: string | null;
  product_count: number;
}

export interface ProductCollection {
  id: string;
  title: string;
  handle: string;
  product_count: number;
}

export interface ProductMetadata {
  landing_featured?: boolean;
  landing_order?: number;
  landing_badge?: string;
  landing_short_description?: string;
  landing_theme?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  handle: string;
  is_giftcard: boolean;
  status: "published" | "draft";
  thumbnail: string;
  images: string[];
  options: ProductOption[];
  variants: ProductVariant[];
  categories: ProductCategory[];
  collection_id?: string;
  collection?: ProductCollection;
  metadata: ProductMetadata;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  title: string;
  variant_title: string;
  thumbnail: string;
  quantity: number;
  unit_price: number;
  total: number;
  options: Record<string, string>;
}

export interface Promotion {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number; // 10 for 10%, or 5000 for $5000 CLP
  min_subtotal: number;
  active: boolean;
  start_date: string;
  end_date: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  currency_code: string;
  estimated_days: string;
}

export interface CustomerAddress {
  id: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code?: string;
  phone: string;
}

export interface Cart {
  id: string;
  region_id: string;
  currency_code: string;
  email?: string;
  shipping_address?: CustomerAddress;
  shipping_option?: ShippingOption;
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  promotions: Promotion[];
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  display_id: string;
  cart_id: string;
  customer_id?: string;
  email: string;
  status: "pending" | "paid" | "completed" | "canceled";
  fulfillment_status: "not_fulfilled" | "fulfilled" | "shipped" | "delivered";
  payment_status: "awaiting" | "captured" | "refunded";
  shipping_address: CustomerAddress;
  shipping_option: ShippingOption;
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  currency_code: string;
  payment_provider: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  addresses: CustomerAddress[];
  orders: Order[];
  created_at: string;
}
