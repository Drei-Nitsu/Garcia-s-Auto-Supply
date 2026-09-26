import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import InventoryPage from '@/pages/InventoryPage';
import SetupNotice from '@/components/SetupNotice';

// Reports pulls in Recharts — load it only when an admin opens it
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

export default function App() {
  const { session, loading, isAdmin } = useAuth();

  if (!isSupabaseConfigured) return <SetupNotice />;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route
          path="/dashboard"
          element={
            isAdmin ? (
              <Suspense fallback={<div className="p-6 text-slate-400">Loading reports…</div>}>
                <DashboardPage />
              </Suspense>
            ) : (
              <Navigate to="/pos" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Route>
    </Routes>
  );
}
