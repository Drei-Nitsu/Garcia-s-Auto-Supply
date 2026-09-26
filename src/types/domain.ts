import type { PaymentMethod, Tables } from './database.types';

export type Product = Tables<'products'>;
export type Category = Tables<'categories'>;
export type Customer = Tables<'customers'>;
export type Profile = Tables<'profiles'>;
export type Transaction = Tables<'transactions'>;
export type TransactionItem = Tables<'transaction_items'>;
export type InventoryLog = Tables<'inventory_logs'>;

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(p: Pick<Product, 'stock_quantity' | 'reorder_level'>): StockStatus {
  if (p.stock_quantity <= 0) return 'OUT_OF_STOCK';
  if (p.stock_quantity <= p.reorder_level) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Line discount in pesos (not %) */
  discount: number;
  /** Stock at the time it was added — used for client-side guard only */
  maxQuantity: number;
}

export interface CheckoutPayload {
  paymentMethod: PaymentMethod;
  customerId: string | null;
  paymentReference: string | null;
  amountTendered: number | null;
}

/** Shape returned by the process_checkout RPC */
export interface CheckoutResult {
  transaction_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  amount_tendered: number | null;
  change_due: number | null;
  created_at: string;
}

export interface ReceiptData extends CheckoutResult {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  cashierName: string;
  customerName: string | null;
}

export interface DashboardMetrics {
  revenue_today: number;
  revenue_month: number;
  transactions_today: number;
  transactions_month: number;
  low_stock_count: number;
  out_of_stock_count: number;
}
