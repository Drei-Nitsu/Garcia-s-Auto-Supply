import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardMetrics } from '@/types/domain';
import { queryKeys } from './useProducts';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: [...queryKeys.dashboard, 'metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_metrics');
      if (error) throw error;
      const m = data as unknown as Record<keyof DashboardMetrics, number | string>;
      return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Number(v)])) as unknown as DashboardMetrics;
    },
    refetchInterval: 60_000,
  });
}

export function useSalesTrend(days: number) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, 'trend', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_trend', { p_days: days });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        day: d.day,
        label: new Date(d.day + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        revenue: Number(d.revenue),
        transactions: Number(d.transactions),
      }));
    },
  });
}

export function useTopProducts(days: number, limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, 'top', days, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_products', { p_days: days, p_limit: limit });
      if (error) throw error;
      return (data ?? []).map((d) => ({ ...d, qty_sold: Number(d.qty_sold), revenue: Number(d.revenue) }));
    },
  });
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, invoice_number, total_amount, payment_method, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
