import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/hooks/use-theme';
import { AuthInitializer } from '@/components/AuthInitializer';
import { RoleRedirect } from '@/components/RoleRedirect';
import { ProtectedRoute } from '@/guards/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { TabletLayout } from '@/layouts/TabletLayout';
import { CustomerLayout } from '@/layouts/CustomerLayout';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Login               = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const AdminDashboard      = lazy(() => import('@/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MenuManagement      = lazy(() => import('@/pages/RestaurantAdmin/MenuManagement').then(m => ({ default: m.MenuManagement })));
const TableManagement     = lazy(() => import('@/pages/RestaurantAdmin/TableManagement').then(m => ({ default: m.TableManagement })));
const ManageQr        = lazy(() => import('@/pages/RestaurantAdmin/ManageQr').then(m => ({ default: m.default })));
const Billing             = lazy(() => import('@/pages/RestaurantAdmin/Billing').then(m => ({ default: m.Billing })));
const Analytics           = lazy(() => import('@/pages/RestaurantAdmin/Analytics').then(m => ({ default: m.Analytics })));
const StaffManagement     = lazy(() => import('@/pages/RestaurantAdmin/StaffManagement').then(m => ({ default: m.StaffManagement })));
const Settings            = lazy(() => import('@/pages/RestaurantAdmin/Settings').then(m => ({ default: m.Settings })));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdmin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const CreateRestaurant    = lazy(() => import('@/pages/SuperAdmin/CreateRestaurant').then(m => ({ default: m.CreateRestaurant })));
const SimulationDashboard = lazy(() => import('@/pages/SuperAdmin/SimulationDashboard').then(m => ({ default: m.SimulationDashboard })));
// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Note: keeping lazy definitions above and route path mappings below.
const WaiterDashboard     = lazy(() => import('@/pages/Waiter/WaiterDashboard').then(m => ({ default: m.WaiterDashboard })));
const TakeOrder           = lazy(() => import('@/pages/TakeOrder/TakeOrder').then(m => ({ default: m.TakeOrder })));
const KitchenDashboard    = lazy(() => import('@/pages/Kitchen/KitchenDashboard').then(m => ({ default: m.KitchenDashboard })));
const CustomerMenu        = lazy(() => import('@/pages/Customer/CustomerMenu').then(m => ({ default: m.CustomerMenu })));
const Cart                = lazy(() => import('@/pages/Customer/Cart').then(m => ({ default: m.Cart })));
const OrderSuccess        = lazy(() => import('@/pages/Customer/OrderSuccess').then(m => ({ default: m.OrderSuccess })));
const SubscriptionExpired = lazy(() => import('@/pages/SubscriptionExpired').then(m => ({ default: m.SubscriptionExpired })));
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthInitializer>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>

                  {/* ── Public ──────────────────────────────────────── */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<RoleRedirect />} />

                  {/* ── Admin / Manager / Cashier ───────────────────── */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN', 'MANAGER', 'CASHIER']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<AdminDashboard />} />
                    <Route path="menu"       element={<MenuManagement />} />
                    <Route path="tables"     element={<TableManagement />} />
                    <Route path="manageqr"   element={<ManageQr />} />
                    <Route path="billing"    element={<Billing />} />
                    <Route path="analytics"  element={<Analytics />} />
                    <Route path="staff"      element={<StaffManagement />} />
                    <Route path="take-order" element={<TakeOrder />} />
                  </Route>

                  {/* ── Super Admin ─────────────────────────────────── */}
                  <Route path="/super-admin" element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<SuperAdminDashboard />} />
                    <Route path="create" element={<CreateRestaurant />} />
                    <Route path="simulation" element={<SimulationDashboard />} />
                  </Route>

                  {/* ── Waiter ──────────────────────────────────────── */}
                  <Route path="/waiter" element={
                    <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN', 'MANAGER', 'WAITER']}>
                      <TabletLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<WaiterDashboard />} />
                    <Route path="take-order" element={<TakeOrder />} />
                  </Route>

                  {/* ── Kitchen ─────────────────────────────────────── */}
                  <Route path="/kitchen" element={
                    <ProtectedRoute allowedRoles={['KITCHEN', 'RESTAURANT_ADMIN']}>
                      <KitchenDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Subscription Expired ────────────────────────── */}
                  <Route path="/expired" element={<SubscriptionExpired />} />

                  {/* ── Customer QR Menu ────────────────────────────── */}
                  <Route path="/m/:restaurantId/:tableId" element={<CustomerLayout />}>
                    <Route index element={<CustomerMenu />} />
                    <Route path="cart"    element={<Cart />} />
                    <Route path="success" element={<OrderSuccess />} />
                  </Route>

                  <Route path="/menu" element={<CustomerLayout />}>
                    <Route index element={<CustomerMenu />} />
                    <Route path="cart"    element={<Cart />} />
                    <Route path="success" element={<OrderSuccess />} />
                  </Route>

                  {/* ── 403 Fallback ─────────────────────────────────── */}
                  <Route path="/unauthorized" element={
                    <div className="flex h-screen items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-destructive">403</h1>
                        <p className="text-muted-foreground mt-2">
                          You don't have permission to access this page.
                        </p>
                      </div>
                    </div>
                  } />

                </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster />
          </AuthInitializer>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
