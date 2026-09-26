import { memo, useEffect, useRef } from 'react';
import { Loader2, PackageX } from 'lucide-react';
import StockBadge from '@/components/ui/StockBadge';
import { cn, peso } from '@/lib/utils';
import { getStockStatus, type Product } from '@/types/domain';

interface Props {
  products: Product[];
  highlight: number;
  loading: boolean;
  onAdd: (p: Product) => void;
}

function ProductGrid({ products, highlight, loading, onAdd }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    refs.current[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
        <PackageX className="h-8 w-8" />
        <p className="text-sm">No matching parts</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((p, idx) => {
        const status = getStockStatus(p);
        const out = status === 'OUT_OF_STOCK';
        return (
          <button
            key={p.id}
            ref={(el) => (refs.current[idx] = el)}
            onClick={() => onAdd(p)}
            disabled={out}
            className={cn(
              'card flex flex-col items-start p-3 text-left transition hover:border-brand-500 hover:shadow',
              idx === highlight && 'border-brand-500 ring-2 ring-brand-100',
              out && 'opacity-60',
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-500">{p.sku}</span>
              <StockBadge status={status} />
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{p.name}</div>
            {p.brand && <div className="text-xs text-slate-500">{p.brand}</div>}
            {p.vehicle_compatibility.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {p.vehicle_compatibility.slice(0, 3).map((v) => (
                  <span key={v} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {v}
                  </span>
                ))}
                {p.vehicle_compatibility.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{p.vehicle_compatibility.length - 3}</span>
                )}
              </div>
            )}
            <div className="mt-auto flex w-full items-end justify-between pt-2">
              <span className="text-base font-bold text-brand-700">{peso(p.retail_price)}</span>
              <span className="text-xs text-slate-500">{p.stock_quantity} on hand</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(ProductGrid);
