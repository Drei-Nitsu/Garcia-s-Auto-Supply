import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, Receipt, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardMetrics, useRecentTransactions, useSalesTrend, useTopProducts } from '@/hooks/useDashboard';
import { useLowStockProducts } from '@/hooks/useProducts';
import StockBadge from '@/components/ui/StockBadge';
import { cn, formatDateTime, peso } from '@/lib/utils';

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data: m } = useDashboardMetrics();
  const { data: trend = [], isLoading: trendLoading } = useSalesTrend(days);
  const { data: top = [] } = useTopProducts(days, 5);
  const { data: lowStock = [] } = useLowStockProducts(8);
  const { data: recent = [] } = useRecentTransactions(8);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-800">Sales & Reports</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Banknote} label="Revenue today" value={peso(m?.revenue_today)} sub={`${peso(m?.revenue_month)} this month`} />
        <Metric icon={Receipt} label="Transactions today" value={String(m?.transactions_today ?? 0)} sub={`${m?.transactions_month ?? 0} this month`} />
        <Metric
          icon={AlertTriangle}
          label="Low stock"
          value={String(m?.low_stock_count ?? 0)}
          sub={`${m?.out_of_stock_count ?? 0} out of stock`}
          tone={(m?.low_stock_count ?? 0) + (m?.out_of_stock_count ?? 0) > 0 ? 'warn' : undefined}
        />
        <Metric icon={TrendingUp} label="Top seller" value={top[0]?.name ?? '—'} sub={top[0] ? `${top[0].qty_sold} sold (${days}d)` : ''} small />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Daily revenue</h2>
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn('rounded-md px-3 py-1', days === d ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          {trendLoading ? (
            <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: number) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)}
                  width={56}
                />
                <Tooltip
                  formatter={(v: number, name: string) => (name === 'revenue' ? [peso(v), 'Revenue'] : [v, 'Transactions'])}
                  labelStyle={{ fontWeight: 600 }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Fast-moving items ({days}d)</h2>
          {top.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((t, i) => (
                <li key={t.product_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                    <span className="truncate text-slate-700">{t.name}</span>
                  </span>
                  <span className="whitespace-nowrap text-right">
                    <span className="font-semibold">{t.qty_sold}</span>
                    <span className="ml-2 text-xs text-slate-500">{peso(t.revenue)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Reorder alerts</h2>
            <Link to="/inventory" className="text-xs text-brand-700 hover:underline">View inventory</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400">All items above reorder level.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-slate-700">{p.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{p.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {p.stock_quantity}/{p.reorder_level}
                    </span>
                    <StockBadge status={p.stock_status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Recent sales</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="font-mono text-xs text-slate-700">{t.invoice_number}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatDateTime(t.created_at)} · {t.payment_method}
                    </div>
                  </div>
                  <span className="font-semibold">{peso(t.total_amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  small,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
  small?: boolean;
}) {
  return (
    <div className={cn('card p-4', tone === 'warn' && 'border-amber-300 bg-amber-50')}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className={cn('h-4 w-4', tone === 'warn' ? 'text-amber-600' : 'text-brand-600')} /> {label}
      </div>
      <div className={cn('mt-2 truncate font-bold text-slate-900', small ? 'text-base' : 'text-2xl')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
