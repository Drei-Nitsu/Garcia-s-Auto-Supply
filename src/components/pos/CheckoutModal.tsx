import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, CreditCard, Loader2, Smartphone } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useCheckout } from '@/hooks/useCheckout';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/supabase';
import { cn, peso, round2 } from '@/lib/utils';
import type { PaymentMethod } from '@/types/database.types';
import type { ReceiptData } from '@/types/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (receipt: ReceiptData) => void;
}

const methods: { id: PaymentMethod; label: string; icon: typeof Banknote; key: string }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote, key: '1' },
  { id: 'GCASH', label: 'GCash', icon: Smartphone, key: '2' },
  { id: 'CARD', label: 'Card', icon: CreditCard, key: '3' },
];

export default function CheckoutModal({ open, onClose, onComplete }: Props) {
  const totals = useCartTotals();
  const customer = useCartStore((s) => s.customer);
  const { profile } = useAuth();
  const checkout = useCheckout();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tendered, setTendered] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMethod('CASH');
      setTendered('');
      setReference('');
      setError(null);
      checkout.reset();
      setTimeout(() => amountRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 30);
  }, [method]);

  const tenderedNum = Number(tendered) || 0;
  const change = round2(tenderedNum - totals.total);

  const quickCash = useMemo(() => {
    const t = totals.total;
    const set = new Set<number>([Math.ceil(t)]);
    [100, 500, 1000].forEach((d) => set.add(Math.ceil(t / d) * d));
    return [...set].filter((n) => n >= t).sort((a, b) => a - b).slice(0, 4);
  }, [totals.total]);

  const canSubmit =
    !checkout.isPending &&
    totals.itemCount > 0 &&
    (method === 'CASH' ? tenderedNum >= totals.total : reference.trim().length >= 4);

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    const items = useCartStore.getState().items;
    try {
      const r = await checkout.mutateAsync({
        paymentMethod: method,
        customerId: customer?.id ?? null,
        paymentReference: method === 'CASH' ? null : reference.trim(),
        amountTendered: method === 'CASH' ? tenderedNum : null,
      });
      onComplete({
        ...r,
        items,
        paymentMethod: method,
        paymentReference: method === 'CASH' ? null : reference.trim(),
        cashierName: profile?.full_name ?? '',
        customerName: customer?.name ?? null,
      });
      useCartStore.getState().clear();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      setMethod(methods[Number(e.key) - 1].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Checkout">
      <div onKeyDown={onKeyDown} className="space-y-4">
        <div className="rounded-xl bg-slate-900 p-4 text-center text-white">
          <div className="text-xs uppercase tracking-wider text-slate-400">Amount due</div>
          <div className="text-4xl font-bold">{peso(totals.total)}</div>
          <div className="mt-1 text-xs text-slate-400">
            {totals.itemCount} item(s)
            {totals.totalDiscount > 0 && ` · ${peso(totals.totalDiscount)} discount`}
            {customer && ` · ${customer.name}`}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {methods.map(({ id, label, icon: Icon, key }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 py-3 text-sm font-medium',
                method === id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
              <span className="text-[10px] text-slate-400">Alt+{key}</span>
            </button>
          ))}
        </div>

        {method === 'CASH' ? (
          <div>
            <label className="label">Cash received</label>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="input py-3 text-2xl font-semibold"
              placeholder="0.00"
            />
            <div className="mt-2 flex gap-2">
              {quickCash.map((n) => (
                <button key={n} type="button" onClick={() => setTendered(String(n))} className="btn-secondary flex-1 py-1.5">
                  {peso(n)}
                </button>
              ))}
            </div>
            <div
              className={cn(
                'mt-3 flex items-center justify-between rounded-lg px-4 py-3 text-lg font-bold',
                tendered && change < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
              )}
            >
              <span>{tendered && change < 0 ? 'Short' : 'Change'}</span>
              <span>{peso(Math.abs(tendered ? change : 0))}</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="label">{method === 'GCASH' ? 'GCash reference no.' : 'Card approval / trace no.'}</label>
            <input
              ref={amountRef}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input py-3 font-mono text-lg"
              placeholder={method === 'GCASH' ? '13-digit reference' : 'Approval code'}
            />
            <p className="mt-1 text-xs text-slate-500">Confirm the payment was received before completing the sale.</p>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary flex-[2] py-3 text-base">
            {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete sale <kbd className="kbd border-brand-700 bg-brand-700 text-white">Enter</kbd>
          </button>
        </div>
      </div>
    </Modal>
  );
}
