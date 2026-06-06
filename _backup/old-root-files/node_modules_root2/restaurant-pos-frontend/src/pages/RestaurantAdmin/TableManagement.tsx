import { useState, useMemo } from 'react';
import { useTables } from '@/hooks/api/useTables';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Users, Edit, Search } from 'lucide-react';
import { AddTableDrawer, PartialTable } from '@/components/AddTableDrawer';
import { TableDetailsDrawer } from '@/components/TableDetailsDrawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

type StatusKey = 'available' | 'occupied' | 'reserved' | 'billing';

const statusMap: Record<StatusKey, { label: string; cls: string; dot: string }> = {
  available: { label: 'Available', cls: 'border-success/30 bg-success/5 hover:bg-success/10 text-success', dot: 'bg-success' },
  occupied: { label: 'Occupied', cls: 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  reserved: { label: 'Reserved', cls: 'border-warning/30 bg-warning/5 hover:bg-warning/10 text-warning', dot: 'bg-warning' },
  billing: { label: 'Billing', cls: 'border-info/30 bg-info/5 hover:bg-info/10 text-info', dot: 'bg-info' },
};

export const TableManagement = () => {
  const { data: tables, isLoading } = useTables();
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<PartialTable | null>(null);
  const [selectedTable, setSelectedTable] = useState<PartialTable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { restaurantId } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSaveTable = async (tableData: any) => {
    if (!restaurantId) return;
    logger.start('TABLES', 'SAVE_TABLE', `Saving table ${tableData.table_number}`, tableData);

    try {
      const payload = {
        table_number: tableData.table_number,
        table_name: tableData.table_name || null,
        capacity: tableData.capacity,
        table_type: tableData.table_type,
        status: tableData.status,
        restaurant_id: restaurantId,
        ...(!tableData.id ? { qr_token: crypto.randomUUID() } : {})
      };

      if (tableData.id) {
        const { error } = await supabase.from('tables').update(payload).eq('id', tableData.id);

        if (error?.code === 'PGRST204' || error?.code === '42703') {
          logger.warn('TABLES', 'UPDATE_TABLE_FALLBACK', 'Columns missing, attempting fallback update');
          const { error: fallbackError } = await supabase
            .from('tables')
            .update({
              table_number: tableData.table_number,
              capacity: tableData.capacity,
              status: tableData.status
            })
            .eq('id', tableData.id);
          if (fallbackError) throw fallbackError;
        } else if (error) {
          throw error;
        }
      } else {
        let { error } = await supabase.from('tables').insert([payload]);
        if (error?.code === 'PGRST204' || error?.code === '42703' || error?.message?.includes('does not exist')) {
          logger.warn('TABLES', 'INSERT_TABLE_FALLBACK', 'Columns missing, attempting fallback insert');
          const { error: fallbackError } = await supabase
            .from('tables')
            .insert([{
              restaurant_id: restaurantId,
              table_number: tableData.table_number,
              capacity: tableData.capacity,
              status: tableData.status
            }]);
          if (fallbackError) throw fallbackError;
        } else if (error) {
          throw error;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      setIsAddDrawerOpen(false);
      logger.success('TABLES', 'SAVE_TABLE_SUCCESS', 'Table saved successfully');
      toast({
        title: "Success",
        description: "Table saved successfully.",
      });
    } catch (err: any) {
      logger.error('TABLES', 'SAVE_TABLE_ERROR', err);
      toast({
        title: "Error Saving Table",
        description: err.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!restaurantId) return;
    logger.start('TABLES', 'DELETE_TABLE', `Deleting table ${tableId}`);

    try {
      const { error } = await supabase.from('tables').delete().eq('id', tableId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      logger.success('TABLES', 'DELETE_TABLE_SUCCESS', 'Table deleted successfully');
      toast({
        title: "Success",
        description: "Table deleted successfully.",
      });
    } catch (err: any) {
      logger.error('TABLES', 'DELETE_TABLE_ERROR', err);
      toast({
        title: "Error Deleting Table",
        description: err.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    }
  };

  const normalizedTables = useMemo(() => {
    if (!tables) return [];
    return tables.map(t => {
      let rawStatus = t.status ? t.status.toLowerCase() : 'available';
      if (rawStatus === 'empty') rawStatus = 'available';
      const status = (rawStatus in statusMap ? rawStatus : 'available') as StatusKey;
      return { ...t, status };
    });
  }, [tables]);

  const filteredTables = useMemo(() => {
    return normalizedTables.filter(t => {
      const numMatch = String(t.table_number).includes(searchQuery);
      const nameMatch = t.table_name ? t.table_name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      return numMatch || nameMatch;
    });
  }, [normalizedTables, searchQuery]);

  const counts = useMemo(() => {
    const acc = { available: 0, occupied: 0, reserved: 0, billing: 0 };
    normalizedTables.forEach(t => {
      const status = t.status as StatusKey;
      if (status in acc) {
        acc[status]++;
      }
    });
    return acc;
  }, [normalizedTables]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Floor Plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Tables"
        subtitle="Floor plan · live status of every table"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl bg-card/60 border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
            </div>
            <Button
              className="rounded-xl bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow shrink-0 h-10"
              onClick={() => {
                setTableToEdit(null);
                setIsAddDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Table
            </Button>
          </div>
        }
      />

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(statusMap) as StatusKey[]).map((s) => (
          <div key={s} className="glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", statusMap[s].dot)} />
              {statusMap[s].label}
            </div>
            <div className="text-2xl font-semibold mt-1 text-foreground">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
        {filteredTables.map((t) => {
          const status = t.status as StatusKey;
          const meta = statusMap[status];
          return (
            <div
              key={t.id}
              onClick={() => {
                setSelectedTable(t);
                setIsDetailsDrawerOpen(true);
              }}
              className={cn(
                "group text-left rounded-2xl border p-4 transition-all hover-lift relative overflow-hidden cursor-pointer shadow-card flex flex-col justify-between min-h-[140px]",
                meta.cls
              )}
            >
              {t.status === 'occupied' && (
                <span className="absolute top-3 right-3 size-2 rounded-full bg-destructive pulse-ring" />
              )}
              
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Table</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-background/50 border border-border/20">
                    {meta.label}
                  </span>
                </div>
                <div className="text-3xl font-black mt-1 text-foreground">
                  {String(t.table_number).padStart(2, '0')}
                </div>
                {t.table_name && (
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {t.table_name}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3" /> {t.capacity} pax
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTableToEdit(t);
                    setIsAddDrawerOpen(true);
                  }}
                >
                  <Edit className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-card/20 shadow-inner">
          <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-foreground">No Tables Created</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">Start setting up your restaurant floor by adding tables. You can assign numbers, capacities, and generate QR codes.</p>
          <Button
            className="rounded-xl shadow-md bg-primary hover:opacity-95 text-white font-bold"
            onClick={() => {
              setTableToEdit(null);
              setIsAddDrawerOpen(true);
            }}
          >
            <Plus className="w-5 h-5 mr-2" /> Add Your First Table
          </Button>
        </div>
      )}

      <AddTableDrawer
        isOpen={isAddDrawerOpen}
        onOpenChange={setIsAddDrawerOpen}
        tableToEdit={tableToEdit}
        onSave={handleSaveTable}
      />
      <TableDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onOpenChange={setIsDetailsDrawerOpen}
        table={selectedTable}
        onDelete={handleDeleteTable}
      />
    </div>
  );
};
