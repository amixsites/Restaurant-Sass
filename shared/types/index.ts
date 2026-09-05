// Shared TypeScript types used across frontend and edge functions

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'RESTAURANT_ADMIN' 
  | 'MANAGER' 
  | 'WAITER' 
  | 'KITCHEN' 
  | 'CASHIER' 
  | 'CUSTOMER';

export type OrderStatus = 
  | 'PENDING' 
  | 'PREPARING' 
  | 'READY' 
  | 'SERVED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentMethod = 
  | 'CASH' 
  | 'UPI' 
  | 'CARD' 
  | 'SPLIT';

export type TableStatus = 
  | 'AVAILABLE' 
  | 'OCCUPIED' 
  | 'RESERVED';

export type MenuItemType = 
  | 'veg' 
  | 'non-veg' 
  | 'egg';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  restaurant_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  type: MenuItemType;
  image_url?: string;
  is_available: boolean;
  created_at: string;
}

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  table_name?: string;
  table_type?: string;
  capacity: number;
  status: TableStatus;
  qr_code_url?: string;
  current_order_id?: string;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id?: string;
  waiter_id?: string;
  customer_phone?: string;
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  status: OrderStatus;
  created_at: string;
}

export interface Invoice {
  id: string;
  restaurant_id: string;
  order_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  payment_status: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan_name: string;
  status: string;
  valid_until: string;
  created_at: string;
}
