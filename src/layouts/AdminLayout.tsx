import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantStore } from '@/store/tenantStore';

export const AdminLayout = () => {
  const { user, role } = useAuthStore();
  const signOut = async () => await supabase.auth.signOut();
  const { restaurantName } = useTenantStore();

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  
  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar Placeholder */}
      <aside className="w-64 bg-card border-r flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="font-bold text-xl text-primary">{restaurantName || 'Restaurant POS'}</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {role === 'SUPER_ADMIN' && (
            <Link to="/super-admin">
              <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname === '/super-admin' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                Super Admin
              </div>
            </Link>
          )}
          {isAdmin && (
            <>
              <Link to="/admin">
                <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname === '/admin' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  Dashboard
                </div>
              </Link>
              <Link to="/admin/menu">
                <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname.includes('/menu') ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  Menu Management
                </div>
              </Link>
              <Link to="/admin/tables">
                <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname.includes('/tables') ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  Table Management
                </div>
              </Link>
              <Link to="/admin/billing">
                <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname.includes('/billing') ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  Billing
                </div>
              </Link>
              <Link to="/admin/analytics">
                <div className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${location.pathname.includes('/analytics') ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  Analytics
                </div>
              </Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email || 'Admin'}</span>
              <span className="text-xs text-muted-foreground">{role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 md:hidden">
            <h1 className="font-bold text-xl text-primary">{restaurantName || 'Restaurant POS'}</h1>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
