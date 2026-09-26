import { Minus, Plus, ShoppingCart, Tag, Trash2, X } from 'lucide-react';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import { peso } from '@/lib/utils';
import CustomerPicker from './CustomerPicker';

export default function CartPanel({ onCheckout }: { onCheckout: () => void }) {
  const items = useCartStore((s) => s.items);
  const cartDiscount = useCartStore((s) => s.cartDiscount);
  const { increment, decrement, setQuantity, setLineDiscount, removeItem, setCartDiscount, clear } = useCartStore.getState();
  const t = useCartTotals();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800">
          <ShoppingCart className="h-5 w-5" /> Cart
          <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{t.itemCount}</span>
        </h2>
        {items.length > 0 && (
          <button
            onClick={() => confirm('Clear the cart?') && clear()}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="border-b border-slate-200 px-4 py-2">
        <CustomerPicker />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Scan a barcode or search to add parts.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((i) => {
              const lineGross = i.unitPrice * i.quantity;
              return (
                <li key={i.productId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{i.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {i.sku} · {peso(i.unitPrice)}
                      </div>
                    </div>
                    <button onClick={() => removeItem(i.productId)} className="text-slate-400 hover:text-red-600" aria-label="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button onClick={() => decrement(i.productId)} className="px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={i.maxQuantity}
                        value={i.quantity}
                        onChange={(e) => setQuantity(i.productId, Number(e.target.value))}
                        className="w-12 border-x border-slate-300 py-1 text-center text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => increment(i.productId)}
                        disabled={i.quantity >= i.maxQuantity}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-slate-500" title="Line discount (₱)">
                      <Tag className="h-3.5 w-3.5" />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={i.discount || ''}
                        placeholder="0.00"
                        onChange={(e) => setLineDiscount(i.productId, Number(e.target.value))}
                        className="w-20 rounded border border-slate-300 px-1.5 py-1 text-right text-xs focus:outline-none"
                      />
                    </label>
                    <div className="w-24 text-right text-sm font-semibold text-slate-800">{peso(lineGross - i.discount)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <Row label="Subtotal" value={peso(t.subtotal)} />
        {t.itemDiscounts > 0 && <Row label="Item discounts" value={`− ${peso(t.itemDiscounts)}`} />}
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Cart discount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cartDiscount || ''}
            placeholder="0.00"
            onChange={(e) => setCartDiscount(Number(e.target.value))}
            className="w-24 rounded border border-slate-300 px-2 py-0.5 text-right text-sm focus:outline-none"
          />
        </div>
        <Row label="VATable sales" value={peso(t.vatableSales)} muted />
        <Row label="VAT (12%)" value={peso(t.vat)} muted />
        <div className="flex items-center justify-between pt-2 text-lg font-bold text-slate-900">
          <span>Total</span>
          <span>{peso(t.total)}</span>
        </div>
        <button onClick={onCheckout} disabled={items.length === 0} className="btn-primary mt-2 w-full py-3 text-base">
          Checkout <kbd className="kbd border-brand-700 bg-brand-700 text-white">F12</kbd>
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-xs text-slate-500' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
