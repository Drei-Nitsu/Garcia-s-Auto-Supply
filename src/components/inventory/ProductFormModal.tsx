import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Field } from './StockAdjustModal';
import { useCategories, useUpsertProduct } from '@/hooks/useProducts';
import { errorMessage } from '@/lib/supabase';
import type { Product } from '@/types/domain';

const schema = z
  .object({
    sku: z.string().trim().min(1, 'Required').max(64),
    name: z.string().trim().min(2, 'Required').max(160),
    category_id: z.string().optional(),
    brand: z.string().trim().max(80).optional(),
    vehicles: z.string().optional(),
    cost_price: z.coerce.number().min(0, 'Cannot be negative'),
    retail_price: z.coerce.number().min(0, 'Cannot be negative'),
    reorder_level: z.coerce.number().int().min(0),
    stock_quantity: z.coerce.number().int().min(0).optional(),
  })
  .refine((v) => v.retail_price >= v.cost_price, {
    message: 'Retail price is below cost',
    path: ['retail_price'],
  });

type FormValues = z.infer<typeof schema>;

export default function ProductFormModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const upsert = useUpsertProduct();
  const isNew = !product;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          category_id: product.category_id ?? '',
          brand: product.brand ?? '',
          vehicles: product.vehicle_compatibility.join('\n'),
          cost_price: product.cost_price,
          retail_price: product.retail_price,
          reorder_level: product.reorder_level,
        }
      : { reorder_level: 5, stock_quantity: 0, cost_price: 0 },
  });

  const onSubmit = async (v: FormValues) => {
    await upsert.mutateAsync({
      id: product?.id,
      sku: v.sku,
      name: v.name,
      category_id: v.category_id || null,
      brand: v.brand || null,
      vehicle_compatibility: (v.vehicles ?? '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      cost_price: v.cost_price,
      retail_price: v.retail_price,
      reorder_level: v.reorder_level,
      ...(isNew ? { stock_quantity: v.stock_quantity ?? 0 } : {}),
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'New product' : 'Edit product'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SKU / Barcode / Part no." error={errors.sku?.message}>
          <input className="input font-mono" autoFocus {...register('sku')} />
        </Field>
        <Field label="Brand">
          <input className="input" {...register('brand')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Product name" error={errors.name?.message}>
            <input className="input" {...register('name')} />
          </Field>
        </div>
        <Field label="Category">
          <select className="input" {...register('category_id')}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reorder level" error={errors.reorder_level?.message}>
          <input type="number" className="input" {...register('reorder_level')} />
        </Field>
        <Field label="Cost price (₱)" error={errors.cost_price?.message}>
          <input type="number" step="0.01" className="input" {...register('cost_price')} />
        </Field>
        <Field label="Retail price (₱, VAT-inclusive)" error={errors.retail_price?.message}>
          <input type="number" step="0.01" className="input" {...register('retail_price')} />
        </Field>
        {isNew && (
          <Field label="Opening stock" error={errors.stock_quantity?.message}>
            <input type="number" className="input" {...register('stock_quantity')} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Vehicle compatibility (one per line or comma-separated)">
            <textarea rows={3} className="input" placeholder={'Toyota Wigo 2020-2025\nVios NCP93'} {...register('vehicles')} />
          </Field>
        </div>
        {!isNew && (
          <p className="text-xs text-slate-500 sm:col-span-2">
            Stock quantity can't be edited here — use Receive stock or Adjust count so every change is logged.
          </p>
        )}
        {upsert.error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{errorMessage(upsert.error)}</p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
