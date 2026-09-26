/**
 * Supabase database types.
 * Hand-written to match supabase/migrations/001_schema.sql.
 * You can regenerate with: npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'cashier';
export type PaymentMethod = 'CASH' | 'GCASH' | 'CARD';
export type InventoryLogType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: UserRole; created_at: string };
        Insert: { id: string; full_name?: string; role?: UserRole; created_at?: string };
        Update: { full_name?: string; role?: UserRole };
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { name?: string };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          category_id: string | null;
          brand: string | null;
          vehicle_compatibility: string[];
          cost_price: number;
          retail_price: number;
          stock_quantity: number;
          reorder_level: number;
          is_active: boolean;
          stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          category_id?: string | null;
          brand?: string | null;
          vehicle_compatibility?: string[];
          cost_price?: number;
          retail_price: number;
          stock_quantity?: number;
          reorder_level?: number;
          is_active?: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          category_id?: string | null;
          brand?: string | null;
          vehicle_compatibility?: string[];
          cost_price?: number;
          retail_price?: number;
          reorder_level?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          contact_number: string | null;
          vehicle_plate_no: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_number?: string | null;
          vehicle_plate_no?: string | null;
          address?: string | null;
        };
        Update: {
          name?: string;
          contact_number?: string | null;
          vehicle_plate_no?: string | null;
          address?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          invoice_number: string;
          cashier_id: string;
          customer_id: string | null;
          subtotal: number;
          discount: number;
          tax: number;
          total_amount: number;
          payment_method: PaymentMethod;
          payment_reference: string | null;
          amount_tendered: number | null;
          change_due: number | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          product_id: string;
          product_name: string;
          sku: string;
          quantity: number;
          unit_price: number;
          discount: number;
          subtotal: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      inventory_logs: {
        Row: {
          id: string;
          product_id: string;
          change_amount: number;
          quantity_after: number;
          type: InventoryLogType;
          reference_id: string | null;
          notes: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      process_checkout: {
        Args: {
          p_items: Json;
          p_payment_method: PaymentMethod;
          p_customer_id?: string | null;
          p_cart_discount?: number;
          p_payment_reference?: string | null;
          p_amount_tendered?: number | null;
        };
        Returns: Json;
      };
      adjust_stock: {
        Args: {
          p_product_id: string;
          p_change: number;
          p_type: InventoryLogType;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['products']['Row'];
      };
      search_products: {
        Args: { p_query: string; p_limit?: number };
        Returns: Database['public']['Tables']['products']['Row'][];
      };
      get_dashboard_metrics: { Args: Record<string, never>; Returns: Json };
      get_sales_trend: {
        Args: { p_days?: number };
        Returns: { day: string; revenue: number; transactions: number }[];
      };
      get_top_products: {
        Args: { p_days?: number; p_limit?: number };
        Returns: { product_id: string; name: string; sku: string; qty_sold: number; revenue: number }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      payment_method: PaymentMethod;
      inventory_log_type: InventoryLogType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
