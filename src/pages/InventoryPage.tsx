import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, History, PackagePlus, Pencil, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCategories, useInventory, type InventoryParams, type StockFilter } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import StockBadge from '@/components/ui/StockBadge';
import StockAdjustModal from '@/components/inventory/StockAdjustModal';
import ProductFormModal from '@/components/inventory/ProductFormModal';
import StockHistoryModal from '@/components/inventory/StockHistoryModal';
import { cn, peso } from '@/lib/utils';
import type { Product } from '@/types/domain';

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const { data: categories = [] } = useCategories();
  const [searchInput, setSearchInput] = useState('');
  const [params, setParams] = useState<InventoryParams>({
    search: '',
    page: 0,
    pageSize: PAGE_SIZE,
    sortBy: 'name',
    ascending: true,
    filter: 'ALL',
    categoryId: null,
  });

  useEffect(() => {
    const t = setTimeout(() => setParams((p) => ({ ...p, search: searchInput, page: 0 })), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, error } = useInventory(params);
  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [adjust, setAdjust] = useState<{ product: Product; mode: 'RESTOCK' | 'ADJUSTMENT' } | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [history, setHistory] = useState<Product | null>(null);

  const sort = (col: InventoryParams['sortBy']) =>
    setParams((p) => ({ ...p, sortBy: col, ascending: p.sortBy === col ? !p.ascending : true, page: 0 }));

  const SortIcon = ({ col }: { col: InventoryParams['sortBy'] }) =>
    params.sortBy === col ? (params.ascending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null;

  const filters: { id: StockFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'LOW', label: 'Low stock' },
    { id: 'OUT', label: 'Out of stock' },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Inventory</h1>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New product
          </button>
        )}
      </div>

      <div className="card mb-3 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search SKU, name, brand…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={params.categoryId ?? ''}
          onChange={(e) => setParams((p) => ({ ...p, categoryId: e.target.value || null, page: 0 }))}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-slate-300 p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setParams((p) => ({ ...p, filter: f.id, page: 0 }))}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm',
                params.filter === f.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {f.id !== 'ALL' && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <Th onClick={() => sort('sku')}>SKU <SortIcon col="sku" /></Th>
              <Th onClick={() => sort('name')}>Product <SortIcon col="name" /></Th>
              <th className="px-3 py-2">Category</th>
              <Th onClick={() => sort('retail_price')} right>Price <SortIcon col="retail_price" /></Th>
              <Th onClick={() => sort('stock_quantity')} right>Stock <SortIcon col="stock_quantity" /></Th>
              <th className="px-3 py-2 text-right">Reorder at</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-slate-100', isFetching && 'opacity-70')}>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-red-600">Failed to load inventory.</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">No products found.</td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className={cn('hover:bg-slate-50', !p.is_active && 'opacity-50')}>
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {[p.brand, p.vehicle_compatibility.join(', ')].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600">{p.categories?.name ?? '—'}</td>
                <td className="px-3 py-2 text-right">{peso(p.retail_price)}</td>
                <td className="px-3 py-2 text-right font-semibold">{p.stock_quantity}</td>
                <td className="px-3 py-2 text-right text-slate-500">{p.reorder_level}</td>
                <td className="px-3 py-2">
                  <StockBadge status={p.stock_status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <IconBtn title="Receive stock" onClick={() => setAdjust({ product: p, mode: 'RESTOCK' })}>
                      <PackagePlus className="h-4 w-4" />
                    </IconBtn>
                    {isAdmin && (
                      <IconBtn title="Adjust count" onClick={() => setAdjust({ product: p, mode: 'ADJUSTMENT' })}>
                        <SlidersHorizontal className="h-4 w-4" />
                      </IconBtn>
                    )}
                    <IconBtn title="Stock history" onClick={() => setHistory(p)}>
                      <History className="h-4 w-4" />
                    </IconBtn>
                    {isAdmin && (
                      <IconBtn title="Edit" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          {total} product(s) · page {params.page + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={params.page === 0} onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}>
            Previous
          </button>
          <button
            className="btn-secondary"
            disabled={params.page + 1 >= pages}
            onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      </div>

      {adjust && <StockAdjustModal product={adjust.product} mode={adjust.mode} onClose={() => setAdjust(null)} />}
      {editing && <ProductFormModal product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {history && <StockHistoryModal product={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function Th({ children, onClick, right }: { children: React.ReactNode; onClick: () => void; right?: boolean }) {
  return (
    <th className={cn('px-3 py-2', right && 'text-right')}>
      <button onClick={onClick} className={cn('inline-flex items-center gap-1 uppercase hover:text-slate-800', right && 'flex-row-reverse')}>
        {children}
      </button>
    </th>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700">
      {children}
    </button>
  );
}
