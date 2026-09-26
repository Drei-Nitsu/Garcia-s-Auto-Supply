import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, LogOut, Package, ShoppingCart, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeProducts } from '@/hooks/useProducts';
import { useDashboardMetrics } from '@/hooks/useDashboard';
import { cn, STORE_NAME } from '@/lib/utils';

export default function AppLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  useRealtimeProducts();
  const { data: metrics } = useDashboardMetrics();
  const alertCount = (metrics?.low_stock_count ?? 0) + (metrics?.out_of_stock_count ?? 0);

  const links = [
    { to: '/pos', label: 'POS', icon: ShoppingCart, show: true, badge: 0 },
    { to: '/inventory', label: 'Inventory', icon: Package, show: true, badge: alertCount },
    { to: '/dashboard', label: 'Reports', icon: BarChart3, show: isAdmin, badge: 0 },
  ];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold">
            <Wrench className="h-5 w-5 text-brand-500" />
            <span className="hidden sm:inline">{STORE_NAME}</span>
          </div>
          <nav className="flex gap-1">
            {links
              .filter((l) => l.show)
              .map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
                      isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                  {badge > 0 && (
                    <span
                      title="Low / out of stock items"
                      className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px]"
                    >
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right leading-tight">
            <div className="font-medium">{profile?.full_name}</div>
            <div className="text-xs capitalize text-slate-400">{profile?.role}</div>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
