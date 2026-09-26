import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category, Customer, InventoryLog, Product } from '@/types/domain';
import type { InventoryLogType } from '@/types/database.types';

export const queryKeys = {
  products: ['products'] as const,
  productSearch: (q: string) => ['products', 'search', q] as const,
  inventory: (params: InventoryParams) => ['products', 'inventory', params] as const,
  categories: ['categories'] as const,
  customers: (q: string) => ['customers', q] as const,
  logs: (productId: string) => ['inventory_logs', productId] as const,
  dashboard: ['dashboard'] as const,
};

/** POS fast search — SKU, name, brand, or vehicle tag (partial). */
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.productSearch(query),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_products', { p_query: query, p_limit: 60 });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Exact SKU/barcode lookup for scanner input. */
export async function fetchProductBySku(sku: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku.trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type StockFilter = 'ALL' | 'LOW' | 'OUT';
export interface InventoryParams {
  search: string;
  page: number;
  pageSize: number;
  sortBy: 'name' | 'stock_quantity' | 'sku' | 'retail_price';
  ascending: boolean;
  filter: StockFilter;
  categoryId: string | null;
}

/** Paginated inventory table (server-side paging and sorting). */
export function useInventory(params: InventoryParams) {
  return useQuery({
    queryKey: queryKeys.inventory(params),
    queryFn: async () => {
      const from = params.page * params.pageSize;
      let q = supabase
        .from('products')
        .select('*, categories(name)', { count: 'exact' })
        .order(params.sortBy, { ascending: params.ascending })
        .range(from, from + params.pageSize - 1);

      const s = params.search.trim().replace(/[%,()]/g, '');
      if (s) q = q.or(`sku.ilike.%${s}%,name.ilike.%${s}%,brand.ilike.%${s}%`);
      if (params.categoryId) q = q.eq('category_id', params.categoryId);
      if (params.filter === 'OUT') q = q.eq('stock_status', 'OUT_OF_STOCK');
      if (params.filter === 'LOW') q = q.eq('stock_status', 'LOW_STOCK');

      const { data, error, count } = await q;
      if (error) throw error;
      const rows = (data ?? []) as (Product & { categories: { name: string } | null })[];
      return { rows, count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });
}

/** Products at or below reorder level (for alerts widget). */
export function useLowStockProducts(limit = 10) {
  return useQuery({
    queryKey: ['products', 'low-stock', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('stock_status', ['LOW_STOCK', 'OUT_OF_STOCK'])
        .order('stock_quantity', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.customers(query),
    queryFn: async () => {
      const s = query.trim().replace(/[%,()]/g, '');
      let q = supabase.from('customers').select('*').order('name').limit(10);
      if (s) q = q.or(`name.ilike.%${s}%,vehicle_plate_no.ilike.%${s}%,contact_number.ilike.%${s}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
    enabled: query.length > 0,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { name: string; contact_number?: string; vehicle_plate_no?: string; address?: string }) => {
      const { data, error } = await supabase.from('customers').insert(c).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useInventoryLogs(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.logs(productId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .eq('product_id', productId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as InventoryLog[];
    },
    enabled: !!productId,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { productId: string; change: number; type: Exclude<InventoryLogType, 'SALE'>; notes?: string }) => {
      const { data, error } = await supabase.rpc('adjust_stock', {
        p_product_id: v.productId,
        p_change: v.change,
        p_type: v.type,
        p_notes: v.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.logs(v.productId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id?: string;
      sku: string;
      name: string;
      category_id: string | null;
      brand: string | null;
      vehicle_compatibility: string[];
      cost_price: number;
      retail_price: number;
      reorder_level: number;
      stock_quantity?: number;
    }) => {
      if (p.id) {
        const { id, stock_quantity: _ignored, ...rest } = p;
        const { error } = await supabase.from('products').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { id: _id, ...rest } = p;
        const { error } = await supabase.from('products').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

/**
 * Supabase Realtime: when any product row changes (sale on another terminal,
 * restock, etc.), refresh product queries so every screen shows live stock.
 */
export function useRealtimeProducts() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.products });
        qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
