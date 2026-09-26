import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/cartStore';
import type { CheckoutPayload, CheckoutResult } from '@/types/domain';
import { queryKeys } from './useProducts';

/**
 * Calls the atomic process_checkout RPC. The server re-reads prices, locks
 * rows, and decrements stock in a single DB transaction — if any line fails
 * (e.g. insufficient stock), nothing is written.
 */
export function useCheckout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
      const { items, cartDiscount } = useCartStore.getState();
      if (items.length === 0) throw new Error('Cart is empty');

      const { data, error } = await supabase.rpc('process_checkout', {
        p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity, discount: i.discount })),
        p_payment_method: payload.paymentMethod,
        p_customer_id: payload.customerId,
        p_cart_discount: cartDiscount,
        p_payment_reference: payload.paymentReference,
        p_amount_tendered: payload.amountTendered,
      });
      if (error) throw error;
      const r = data as unknown as CheckoutResult;
      // numeric columns may arrive as strings
      return {
        ...r,
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        tax: Number(r.tax),
        total_amount: Number(r.total_amount),
        amount_tendered: r.amount_tendered == null ? null : Number(r.amount_tendered),
        change_due: r.change_due == null ? null : Number(r.change_due),
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
