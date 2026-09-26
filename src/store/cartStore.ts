import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Customer, Product } from '@/types/domain';
import { VAT_RATE, round2 } from '@/lib/utils';

export type AddResult = { ok: true } | { ok: false; reason: string };

interface CartState {
  items: CartItem[];
  cartDiscount: number;
  customer: Pick<Customer, 'id' | 'name' | 'vehicle_plate_no'> | null;

  addProduct: (product: Product, qty?: number) => AddResult;
  setQuantity: (productId: string, qty: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setLineDiscount: (productId: string, amount: number) => void;
  removeItem: (productId: string) => void;
  setCartDiscount: (amount: number) => void;
  setCustomer: (c: CartState['customer']) => void;
  clear: () => void;
}

const clampQty = (qty: number, max: number) => Math.max(1, Math.min(Math.floor(qty) || 1, max));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartDiscount: 0,
      customer: null,

      addProduct: (product, qty = 1) => {
        if (product.stock_quantity <= 0) return { ok: false, reason: `${product.name} is out of stock` };
        const existing = get().items.find((i) => i.productId === product.id);
        const currentQty = existing?.quantity ?? 0;
        if (currentQty + qty > product.stock_quantity) {
          return { ok: false, reason: `Only ${product.stock_quantity} left of ${product.name}` };
        }
        set((s) => ({
          items: existing
            ? s.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + qty, maxQuantity: product.stock_quantity, unitPrice: Number(product.retail_price) }
                  : i,
              )
            : [
                ...s.items,
                {
                  productId: product.id,
                  sku: product.sku,
                  name: product.name,
                  unitPrice: Number(product.retail_price),
                  quantity: qty,
                  discount: 0,
                  maxQuantity: product.stock_quantity,
                },
              ],
        }));
        return { ok: true };
      },

      setQuantity: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) => {
            if (i.productId !== productId) return i;
            const quantity = clampQty(qty, i.maxQuantity);
            // keep line discount valid if quantity shrinks
            const discount = Math.min(i.discount, round2(i.unitPrice * quantity));
            return { ...i, quantity, discount };
          }),
        })),

      increment: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        if (item) get().setQuantity(productId, item.quantity + 1);
      },

      decrement: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        if (!item) return;
        if (item.quantity <= 1) get().removeItem(productId);
        else get().setQuantity(productId, item.quantity - 1);
      },

      setLineDiscount: (productId, amount) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId
              ? { ...i, discount: round2(Math.max(0, Math.min(amount || 0, i.unitPrice * i.quantity))) }
              : i,
          ),
        })),

      removeItem: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      setCartDiscount: (amount) => set({ cartDiscount: round2(Math.max(0, amount || 0)) }),

      setCustomer: (customer) => set({ customer }),

      clear: () => set({ items: [], cartDiscount: 0, customer: null }),
    }),
    { name: 'pos-cart', version: 1 },
  ),
);

/** Derived totals — mirrors the math in process_checkout (VAT-inclusive pricing). */
export function computeTotals(items: CartItem[], cartDiscount: number) {
  const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const itemDiscounts = round2(items.reduce((sum, i) => sum + i.discount, 0));
  const afterItems = round2(subtotal - itemDiscounts);
  const effectiveCartDiscount = Math.min(cartDiscount, afterItems);
  const total = round2(afterItems - effectiveCartDiscount);
  const vat = round2((total * VAT_RATE) / (1 + VAT_RATE));
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  return {
    subtotal,
    itemDiscounts,
    cartDiscount: effectiveCartDiscount,
    totalDiscount: round2(itemDiscounts + effectiveCartDiscount),
    vatableSales: round2(total - vat),
    vat,
    total,
    itemCount,
  };
}

export const useCartTotals = () => {
  const items = useCartStore((s) => s.items);
  const cartDiscount = useCartStore((s) => s.cartDiscount);
  return computeTotals(items, cartDiscount);
};
