import React, { useState } from 'react';
import { useTables } from '@/hooks/api/useTables';
import { useAuthStore } from '@/store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  Loader2, 
  Printer, 
  FileDown, 
  Users, 
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { api, getAuthHeaders, fetchWithRetry } from '@/lib/api';

const ManageQr = () => {
  const { data: tables = [], isLoading } = useTables();
  const { role, restaurantId } = useAuthStore();
  const isAdmin = role === 'RESTAURANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [qrRefreshKeys, setQrRefreshKeys] = useState<Record<string, number>>({});

  // Fetch restaurant details
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const setTableLoading = (tableId: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [tableId]: loading }));
  };

  const incrementRefreshKey = (tableId: string) => {
    setQrRefreshKeys(prev => ({ ...prev, [tableId]: (prev[tableId] || 0) + 1 }));
  };

  const handleGenerateQR = async (tableId: string) => {
    setTableLoading(tableId, true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetchWithRetry(api.generateQR(tableId), { method: 'POST', headers });
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Server error (${res.status}): Failed to parse response.`);
      }
      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'QR code generated successfully.' });
        await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        incrementRefreshKey(tableId);
      } else {
        toast({ title: 'Failed', description: (data && data.detail) || 'Could not generate QR Code', variant: 'destructive' });
      }
    } catch (err: any) {
      logger.error('TABLES', 'QR_GEN_ERROR', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTableLoading(tableId, false);
    }
  };

  const handleRegenerateQR = async (tableId: string) => {
    if (!window.confirm('Are you sure you want to regenerate this QR Code? The previous QR Code will stop working immediately.')) {
      return;
    }
    setTableLoading(tableId, true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetchWithRetry(api.regenerateQR(tableId), { method: 'POST', headers });
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Server error (${res.status}): Failed to parse response.`);
      }
      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'QR code regenerated successfully.' });
        await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        incrementRefreshKey(tableId);
      } else {
        toast({ title: 'Failed', description: (data && data.detail) || 'Could not regenerate QR Code', variant: 'destructive' });
      }
    } catch (err: any) {
      logger.error('TABLES', 'QR_REGEN_ERROR', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTableLoading(tableId, false);
    }
  };

  const handleDownloadPNG = (tableId: string) => {
    window.open(api.qrImage(tableId), '_blank');
  };

  const handleDownloadPDF = (tableId: string, tableNumber: string) => {
    const link = document.createElement('a');
    link.href = api.qrPdf(tableId);
    link.download = `table_${tableNumber}_qr.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAll = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading QR Cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header (Hides on browser printing) */}
      <div className="print:hidden">
        <PageHeader
          title="QR Code Seating Cards"
          subtitle="Generate, manage, and print QR codes for self-ordering table seating."
          actions={
            <Button
              onClick={handlePrintAll}
              disabled={tables.filter(t => t.qr_token).length === 0}
              className="rounded-xl bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow shrink-0 h-10"
            >
              <Printer className="w-4 h-4 mr-2" /> Print All QR Cards
            </Button>
          }
        />
      </div>

      {/* Grid of QR Code cards */}
      {tables.length === 0 ? (
        <div className="text-center py-20 bg-card/60 rounded-3xl border border-dashed flex flex-col items-center">
          <TableIcon className="size-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-extrabold text-foreground">No Tables Found</h3>
          <p className="text-muted-foreground mt-2 text-sm">Please create tables first in Table Management to generate QR codes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-10">
          {tables.map((table) => {
            const tableId = table.id;
            const isTableLoading = loadingStates[tableId] || false;
            const refreshKey = qrRefreshKeys[tableId] || 0;

            return (
              <div
                key={tableId}
                className="glass border rounded-3xl p-6 shadow-card hover:border-primary/40 transition-all duration-300 flex flex-col items-center text-center justify-between min-h-[460px] print:border-zinc-300 print:shadow-none print:break-inside-avoid print:min-h-[420px]"
              >
                {/* Header Information */}
                <div className="w-full flex justify-between items-start border-b border-border/40 pb-3 mb-4 print:border-zinc-200">
                  <div className="text-left">
                    <h4 className="text-xl font-black text-foreground">{restaurant?.name || 'Restaurant'}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Table {table.table_number}</p>
                  </div>
                  <Badge variant={table.qr_token ? "default" : "secondary"} className="uppercase font-bold text-[9px] tracking-widest print:border">
                    {table.qr_token ? "Active QR" : "No QR"}
                  </Badge>
                </div>

                {/* Table Metadata */}
                <div className="w-full grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4 text-left print:hidden">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="size-3.5 text-primary" />
                    <span>{table.capacity} Pax Capacity</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium capitalize">
                    <LayoutGrid className="size-3.5 text-primary" />
                    <span>{table.table_type || 'indoor'} Zone</span>
                  </div>
                </div>

                {/* QR Display */}
                {!table.qr_token ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <QrCode className="size-8 text-primary stroke-1" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-foreground">QR Ordering Inactive</h5>
                      <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                        Generate a secure token to enable scan-to-order.
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={() => handleGenerateQR(tableId)}
                        disabled={isTableLoading}
                        className="rounded-xl font-bold bg-primary hover:opacity-95 text-white h-10 px-4 print:hidden"
                      >
                        {isTableLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <QrCode className="w-3.5 h-3.5 mr-1.5" />}
                        Generate QR Code
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center w-full space-y-4">
                    {/* Large QR Preview */}
                    <div className="relative size-44 bg-white rounded-2xl border p-3 flex justify-center items-center shadow-sm print:size-48 print:border-zinc-300">
                      <img
                        src={api.qrImage(tableId, refreshKey)}
                        alt={`QR code for table ${table.table_number}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Instruction text (useful for print outs!) */}
                    <div className="text-xs text-primary font-bold tracking-wide uppercase select-none animate-pulse-slow">
                      Scan to View Menu & Order
                    </div>

                    {/* Actions Panel (Hidden on browser printing) */}
                    <div className="w-full space-y-2 pt-2 print:hidden">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadPNG(tableId)}
                          className="rounded-xl h-10 text-xs font-bold transition-all border-zinc-200 flex items-center justify-center gap-1.5 hover:bg-muted"
                        >
                          <Download className="w-3.5 h-3.5" /> PNG
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadPDF(tableId, table.table_number)}
                          className="rounded-xl h-10 text-xs font-bold transition-all border-zinc-200 flex items-center justify-center gap-1.5 hover:bg-muted"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </Button>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="destructive"
                          variant-type="outline"
                          onClick={() => handleRegenerateQR(tableId)}
                          disabled={isTableLoading}
                          className="w-full rounded-xl h-10 text-xs font-bold transition-all border border-destructive bg-transparent hover:bg-destructive/10 text-destructive flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTableLoading ? 'animate-spin' : ''}`} /> Regenerate QR
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageQr;
