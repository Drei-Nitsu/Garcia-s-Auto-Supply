import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAdjustStock } from '@/hooks/useProducts';
import { errorMessage } from '@/lib/supabase';
import type { Product } from '@/types/domain';

const restockSchema = z.object({
  quantity: z.coerce.number().int('Whole numbers only').positive('Must be at least 1'),
  supplier: z.string().max(120).optional(),
  reference: z.string().max(60).optional(),
  notes: z.string().max(300).optional(),
});

const adjustSchema = z.object({
  quantity: z.coerce.number().int('Whole numbers only').refine((n) => n !== 0, 'Cannot be zero'),
  reason: z.enum(['Physical count', 'Damaged', 'Lost / theft', 'Returned by customer', 'Other']),
  notes: z.string().max(300).optional(),
});

type RestockValues = z.infer<typeof restockSchema>;
type AdjustValues = z.infer<typeof adjustSchema>;

interface Props {
  product: Product;
  mode: 'RESTOCK' | 'ADJUSTMENT';
  onClose: () => void;
}

export default function StockAdjustModal({ product, mode, onClose }: Props) {
  return (
    <Modal open onClose={onClose} title={mode === 'RESTOCK' ? 'Receive stock' : 'Adjust stock count'} size="sm">
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <div className="font-medium text-slate-800">{product.name}</div>
        <div className="font-mono text-xs text-slate-500">{product.sku}</div>
        <div className="mt-1 text-slate-600">
          Current stock: <span className="font-semibold">{product.stock_quantity}</span>
        </div>
      </div>
      {mode === 'RESTOCK' ? <RestockForm product={product} onDone={onClose} /> : <AdjustForm product={product} onDone={onClose} />}
    </Modal>
  );
}

function RestockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const adjust = useAdjustStock();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RestockValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: { quantity: undefined },
  });
  const qty = Number(watch('quantity')) || 0;

  const onSubmit = async (v: RestockValues) => {
    const notes = [v.supplier && `Supplier: ${v.supplier}`, v.reference && `DR/Ref: ${v.reference}`, v.notes]
      .filter(Boolean)
      .join(' | ');
    await adjust.mutateAsync({ productId: product.id, change: v.quantity, type: 'RESTOCK', notes: notes || undefined });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Quantity received" error={errors.quantity?.message}>
        <input type="number" autoFocus className="input" {...register('quantity')} />
      </Field>
      <Field label="Supplier">
        <input className="input" {...register('supplier')} />
      </Field>
      <Field label="Delivery receipt / reference no.">
        <input className="input" {...register('reference')} />
      </Field>
      <Field label="Notes">
        <textarea rows={2} className="input" {...register('notes')} />
      </Field>
      {qty > 0 && (
        <p className="text-sm text-slate-600">
          New stock will be <span className="font-semibold">{product.stock_quantity + qty}</span>
        </p>
      )}
      {adjust.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{errorMessage(adjust.error)}</p>}
      <button className="btn-primary w-full" disabled={adjust.isPending}>
        {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </form>
  );
}

function AdjustForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const adjust = useAdjustStock();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { reason: 'Physical count' },
  });
  const qty = Number(watch('quantity')) || 0;
  const after = product.stock_quantity + qty;

  const onSubmit = async (v: AdjustValues) => {
    await adjust.mutateAsync({
      productId: product.id,
      change: v.quantity,
      type: 'ADJUSTMENT',
      notes: [v.reason, v.notes].filter(Boolean).join(' — '),
    });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Change (use negative to remove, e.g. -2)" error={errors.quantity?.message}>
        <input type="number" autoFocus className="input" {...register('quantity')} />
      </Field>
      <Field label="Reason">
        <select className="input" {...register('reason')}>
          {adjustSchema.shape.reason.options.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea rows={2} className="input" {...register('notes')} />
      </Field>
      {qty !== 0 && (
        <p className={`text-sm ${after < 0 ? 'text-red-600' : 'text-slate-600'}`}>
          Stock after adjustment: <span className="font-semibold">{after}</span>
          {after < 0 && ' (not allowed)'}
        </p>
      )}
      {adjust.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{errorMessage(adjust.error)}</p>}
      <button className="btn-primary w-full" disabled={adjust.isPending || after < 0}>
        {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save adjustment
      </button>
    </form>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
