import { useNavigate } from 'react-router-dom';
import { useImpersonationStore } from '@/store/impersonationStore';
import { useEndImpersonation } from '@/hooks/api/useImpersonation';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedRestaurantName } = useImpersonationStore();
  const endImpersonation = useEndImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="relative z-50 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-lg">
      <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 size-7 rounded-lg bg-white/20 backdrop-blur grid place-items-center">
            <Shield className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80 leading-tight">Impersonation Mode</p>
            <p className="text-sm font-bold truncate leading-tight">
              Viewing as: {impersonatedRestaurantName} Admin
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => endImpersonation.mutate()}
          disabled={endImpersonation.isPending}
          className="shrink-0 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs gap-1.5 transition-all active:scale-95"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Return to Super Admin</span>
          <span className="sm:hidden">Return</span>
        </Button>
      </div>
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
    </div>
  );
};
