import { useCallback, useEffect, useRef, useState } from 'react';
import { Barcode, Search } from 'lucide-react';
import { useProductSearch, fetchProductBySku } from '@/hooks/useProducts';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import ProductGrid from '@/components/pos/ProductGrid';
import CartPanel from '@/components/pos/CartPanel';
import CheckoutModal from '@/components/pos/CheckoutModal';
import Receipt from '@/components/pos/Receipt';
import type { Product, ReceiptData } from '@/types/domain';

function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function POSPage() {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const { data: products = [], isFetching, error } = useProductSearch(debounced);
  const addProduct = useCartStore((s) => s.addProduct);
  const { itemCount } = useCartTotals();
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const add = useCallback(
    (p: Product) => {
      const r = addProduct(p);
      if (r.ok) notify(`Added ${p.name}`);
      else notify(r.reason, 'err');
    },
    [addProduct, notify],
  );

  // Barcode scanner: exact SKU lookup, add immediately
  useBarcodeScanner(async (code) => {
    setQuery('');
    try {
      const p = await fetchProductBySku(code);
      if (p) add(p);
      else notify(`No product with barcode ${code}`, 'err');
    } catch {
      notify('Lookup failed — check connection', 'err');
    }
  });

  useEffect(() => setHighlight(0), [debounced]);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (checkoutOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === 'F12' || e.key === 'F9') {
        e.preventDefault();
        if (itemCount > 0) setCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkoutOpen, itemCount]);

  useEffect(() => searchRef.current?.focus(), []);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && products[highlight]) {
      e.preventDefault();
      add(products[highlight]);
      setQuery('');
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: search + products */}
      <section className="flex min-h-0 flex-1 flex-col p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            data-scanner-target="true"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search SKU, part name, brand, or vehicle (e.g. Vios NCP93)…"
            className="input py-3 pl-10 pr-28 text-base"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-slate-400">
            <Barcode className="h-4 w-4" /> Scanner ready
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span><kbd className="kbd">F2</kbd> search</span>
          <span><kbd className="kbd">↑↓</kbd> select</span>
          <span><kbd className="kbd">Enter</kbd> add</span>
          <span><kbd className="kbd">F12</kbd> checkout</span>
          <span><kbd className="kbd">Esc</kbd> clear</span>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Failed to load products.</p>
          ) : (
            <ProductGrid products={products} highlight={highlight} onAdd={add} loading={isFetching && products.length === 0} />
          )}
        </div>
      </section>

      {/* Right: cart */}
      <aside className="flex w-full flex-col border-t border-slate-200 bg-white lg:w-[420px] lg:border-l lg:border-t-0">
        <CartPanel onCheckout={() => setCheckoutOpen(true)} />
      </aside>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          searchRef.current?.focus();
        }}
        onComplete={(r) => {
          setReceipt(r);
          setCheckoutOpen(false);
          notify(`Sale ${r.invoice_number} completed`);
          // let React render the receipt, then print
          setTimeout(() => window.print(), 150);
          searchRef.current?.focus();
        }}
      />

      {receipt && <Receipt data={receipt} />}

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.tone === 'ok' ? 'bg-slate-800' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
