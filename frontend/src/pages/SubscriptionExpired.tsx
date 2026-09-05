import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export const SubscriptionExpired = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Subscription Expired
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Your restaurant's subscription plan has expired. Operational features including Waiter, Kitchen, and QR Menus have been paused.
        </p>
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-sm text-left">
          <p className="font-semibold mb-2">To resume operations:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
            <li>Contact the SaaS Platform Administrator.</li>
            <li>Renew your billing plan to restore access instantly.</li>
          </ul>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Button onClick={() => window.open('mailto:billing@platform.com')} className="w-full">
            Contact Billing Support
          </Button>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
