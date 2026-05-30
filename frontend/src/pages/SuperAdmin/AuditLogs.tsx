import { useAuditLogs } from '@/hooks/api/useImpersonation';
import { useRestaurants } from '@/hooks/api/useRestaurants';
import { Loader2, Shield, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const [restaurantFilter, setRestaurantFilter] = useState<string>('');
  const limit = 15;

  const { data, isLoading } = useAuditLogs(page, limit, restaurantFilter || undefined);
  const { data: restaurants } = useRestaurants();

  if (isLoading && page === 1) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Audit Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Track all impersonation activity for security and compliance."
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span className="font-medium">Filter by:</span>
        </div>
        <select
          value={restaurantFilter}
          onChange={(e) => {
            setRestaurantFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-xl bg-card/60 border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground min-w-[200px]"
        >
          <option value="">All Restaurants</option>
          {restaurants?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {restaurantFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRestaurantFilter('');
              setPage(1);
            }}
            className="h-8 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-border bg-card/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-amber-500" />
              Impersonation History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.totalCount || 0} total entries
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Date &amp; Time</th>
                <th className="px-6 py-4 font-semibold">Super Admin</th>
                <th className="px-6 py-4 font-semibold">Restaurant</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Browser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data?.logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-card/10 transition-colors">
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                    <div className="font-medium text-foreground">
                      {new Date(log.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div>
                      {new Date(log.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">{log.super_admin_email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-foreground">{log.restaurant_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border',
                        log.action === 'IMPERSONATE_START'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      )}
                    >
                      {log.action === 'IMPERSONATE_START' ? 'Login As Admin' : 'Returned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                      {log.user_agent
                        ? log.user_agent.split(' ').slice(0, 3).join(' ') + '...'
                        : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.logs || data.logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-14 rounded-2xl bg-muted/30 grid place-items-center">
                        <Shield className="size-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">No audit logs yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Impersonation activities will appear here.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/5">
            <p className="text-xs text-muted-foreground">
              Page {page} of {data.totalPages} · {data.totalCount} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 rounded-xl text-xs"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="h-8 rounded-xl text-xs"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
