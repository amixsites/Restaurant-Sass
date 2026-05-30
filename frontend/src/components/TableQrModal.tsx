import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, Download, RefreshCw, Loader2, Table as TableIcon, FileDown, CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { PartialTable } from './AddTableDrawer';

interface TableQrModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: PartialTable | null;
  onUpdate?: () => void;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({
  isOpen,
  onOpenChange,
  table,
  onUpdate,
}) => {
  const { role, restaurantId } = useAuthStore();
  const isAdmin = role === 'RESTAURANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrRefreshKey, setQrRefreshKey] = useState(0);

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
    enabled: !!restaurantId && isOpen,
  });

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': session ? `Bearer ${session.access_token}` : '',
    };
  };

  const handleGenerateQR = async () => {
    if (!table?.id) return;
    setIsQrLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/tables/${table.id}/generate-qr`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'QR code generated successfully.' });
        
        // Force refresh table
        if (table) {
          table.qr_token = data.qr_token;
        }

        // Invalidate queries to update parent UI
        await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        setQrRefreshKey(prev => prev + 1);
        if (onUpdate) onUpdate();
      } else {
        toast({ title: 'Failed', description: data.detail || 'Could not generate QR Code', variant: 'destructive' });
      }
    } catch (err: any) {
      logger.error('TABLES', 'GENERATE_ERROR', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!table?.id) return;
    if (!window.confirm('Are you sure you want to regenerate the table QR Code? The previous QR Code will stop working immediately.')) {
      return;
    }
    setIsQrLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/tables/${table.id}/regenerate-qr`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Success', description: 'QR code regenerated successfully.' });
        
        // Force refresh table
        if (table) {
          table.qr_token = data.qr_token;
        }

        await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        setQrRefreshKey(prev => prev + 1);
        if (onUpdate) onUpdate();
      } else {
        toast({ title: 'Failed', description: data.detail || 'Could not regenerate QR Code', variant: 'destructive' });
      }
    } catch (err: any) {
      logger.error('TABLES', 'REGENERATE_ERROR', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!table?.id) return;
    window.open(`/api/tables/${table.id}/qr-code-image`, '_blank');
  };

  const handleDownloadPDF = () => {
    if (!table?.id) return;
    const link = document.createElement('a');
    link.href = `/api/tables/${table.id}/qr-code-pdf`;
    link.download = `table_${table.table_number}_qr.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-zinc-200 bg-background/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Manage QR Code
          </DialogTitle>
          <DialogDescription>
            Table QR Ordering setup for Table {table.table_number}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Metadata Card */}
          <div className="bg-muted/40 p-4 rounded-xl border border-border/50 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Restaurant</p>
              <h4 className="font-extrabold text-foreground text-base mt-0.5">{restaurant?.name || 'Restaurant'}</h4>
              <p className="text-xs text-muted-foreground mt-1">Table {table.table_number} ({table.capacity} Pax)</p>
            </div>
            <Badge variant={table.qr_token ? "default" : "secondary"} className="uppercase font-bold text-[10px] tracking-wide">
              {table.qr_token ? "Active QR" : "No QR"}
            </Badge>
          </div>

          {/* QR Preview & Actions */}
          {!table.qr_token ? (
            <div className="text-center py-10 border border-dashed rounded-xl bg-muted/10 space-y-4 flex flex-col items-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <QrCode className="size-8 text-primary stroke-1" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-foreground">No QR Code Registered</h5>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                  Customers can scan this QR code to view the menu and place orders directly from their tables.
                </p>
              </div>
              {isAdmin && (
                <Button 
                  onClick={handleGenerateQR}
                  disabled={isQrLoading}
                  className="rounded-xl font-bold bg-primary hover:opacity-95 text-white h-11 px-6 shadow-glow"
                >
                  {isQrLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                  Generate QR Code
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center">
              {/* QR Large Preview Card */}
              <div className="relative size-48 bg-white rounded-2xl border shadow-sm p-4 flex justify-center items-center group overflow-hidden">
                <img 
                  src={`/api/tables/${table.id}/qr-code-image?t=${qrRefreshKey}`} 
                  alt={`QR Code Table T-${table.table_number}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadPNG}
                  className="rounded-xl h-11 text-xs font-bold transition-all border-zinc-200 flex items-center justify-center gap-2 hover:bg-muted"
                >
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="rounded-xl h-11 text-xs font-bold transition-all border-zinc-200 flex items-center justify-center gap-2 hover:bg-muted"
                >
                  <FileDown className="w-4 h-4" /> Download PDF
                </Button>
              </div>

              {isAdmin && (
                <Button
                  variant="destructive"
                  variant-type="outline"
                  onClick={handleRegenerateQR}
                  disabled={isQrLoading}
                  className="w-full rounded-xl h-11 text-xs font-bold transition-all border border-destructive bg-transparent hover:bg-destructive/10 text-destructive mt-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isQrLoading ? 'animate-spin' : ''}`} /> Regenerate QR Token
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
