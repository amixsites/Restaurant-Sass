import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AppSidebar } from '../components/layout/AppSidebar';
import { TopBar } from '../components/layout/TopBar';
import { MobileBottomNav, MobileDrawer } from '../components/layout/MobileNav';
import { ImpersonationBanner } from '../components/ImpersonationBanner';

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />
        <TopBar onMobileMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 md:p-6 pb-28 md:pb-6 animate-float-in">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

