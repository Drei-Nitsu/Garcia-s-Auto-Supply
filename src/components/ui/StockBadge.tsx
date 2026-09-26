import { cn } from '@/lib/utils';
import type { StockStatus } from '@/types/domain';

const styles: Record<StockStatus, string> = {
  IN_STOCK: 'bg-green-100 text-green-700',
  LOW_STOCK: 'bg-amber-100 text-amber-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-700',
};
const labels: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
};

export default function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span className={cn('inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', styles[status], className)}>
      {labels[status]}
    </span>
  );
}
