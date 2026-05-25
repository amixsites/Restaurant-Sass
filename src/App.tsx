import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthInitializer } from './components/AuthInitializer';
import { RoleRedirect } from './components/RoleRedirect';
import { ProtectedRoute } from '@/guards/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Login } from '@/pages/Login';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { MenuManagement } from '@/pages/RestaurantAdmin/MenuManagement';
import { TableManagement } from '@/pages/RestaurantAdmin/TableManagement';
import { Billing } from '@/pages/RestaurantAdmin/Billing';
import { Analytics } from '@/pages/RestaurantAdmin/Analytics';
import { StaffManagement } from '@/pages/RestaurantAdmin/StaffManagement';
import { SuperAdminDashboard } from '@/pages/SuperAdmin/SuperAdminDashboard';
import { CreateRestaurant } from '@/pages/SuperAdmin/CreateRestaurant';
import { SubscriptionExpired } from '@/pages/SubscriptionExpired';
import { TabletLayout } from '@/layouts/TabletLayout';
import { WaiterDashboard } from '@/pages/Waiter/WaiterDashboard';
import { KitchenDashboard } from '@/pages/Kitchen/KitchenDashboard';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { CustomerMenu } from '@/pages/Customer/CustomerMenu';
import { Cart } from '@/pages/Customer/Cart';
import { OrderSuccess } from '@/pages/Customer/OrderSuccess';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Root Route acts as Role Redirector */}
            <Route path="/" element={<RoleRedirect />} />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN', 'MANAGER']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="tables" element={<TableManagement />} />
              <Route path="billing" element={<Billing />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="staff" element={<StaffManagement />} />
            </Route>

            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="create" element={<CreateRestaurant />} />
            </Route>

            <Route path="/waiter" element={
              <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN', 'MANAGER', 'WAITER']}>
                <TabletLayout />
              </ProtectedRoute>
            }>
              <Route index element={<WaiterDashboard />} />
            </Route>

            <Route path="/kitchen" element={
              <ProtectedRoute allowedRoles={['KITCHEN', 'RESTAURANT_ADMIN']}>
                <KitchenDashboard />
              </ProtectedRoute>
            } />

            <Route path="/expired" element={<SubscriptionExpired />} />

            {/* Public Customer Routes */}
            <Route path="/m/:restaurantId/:tableId" element={<CustomerLayout />}>
              <Route index element={<CustomerMenu />} />
              <Route path="cart" element={<Cart />} />
              <Route path="success" element={<OrderSuccess />} />
            </Route>

            {/* Default fallback */}
            <Route path="/unauthorized" element={
              <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-destructive">403</h1>
                  <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthInitializer>
    </QueryClientProvider>
  );
}

export default App;
