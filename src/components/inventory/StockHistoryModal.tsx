import Modal from '@/components/ui/Modal';
import { useInventoryLogs } from '@/hooks/useProducts';
import { cn, formatDateTime } from '@/lib/utils';
import type { Product } from '@/types/domain';

const typeStyles = {
  SALE: 'bg-blue-100 text-blue-700',
  RESTOCK: 'bg-green-100 text-green-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
} as const;

export default function StockHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: logs = [], isLoading } = useInventoryLogs(product.id);

  return (
    <Modal open onClose={onClose} title={`Stock history — ${product.name}`} size="lg">
      {isLoading ? (
        <p className="text-center text-sm text-slate-400">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-slate-400">No stock movements yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">When</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Change</th>
              <th className="py-2 text-right">After</th>
              <th className="py-2 pl-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap py-2 text-slate-600">{formatDateTime(l.created_at)}</td>
                <td className="py-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', typeStyles[l.type])}>{l.type}</span>
                </td>
                <td className={cn('py-2 text-right font-semibold', l.change_amount > 0 ? 'text-green-700' : 'text-red-600')}>
                  {l.change_amount > 0 ? `+${l.change_amount}` : l.change_amount}
                </td>
                <td className="py-2 text-right">{l.quantity_after}</td>
                <td className="py-2 pl-4 text-xs text-slate-500">{l.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
