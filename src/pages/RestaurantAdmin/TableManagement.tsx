import { useState } from 'react';
import { useTables } from '@/hooks/api/useTables';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Users, Clock, Edit, Search } from 'lucide-react';
import { AddTableDrawer, PartialTable } from '@/components/AddTableDrawer';
import { TableDetailsDrawer } from '@/components/TableDetailsDrawer';

export const TableManagement = () => {
  const { data: tables, isLoading } = useTables();
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<PartialTable | null>(null);
  const [selectedTable, setSelectedTable] = useState<PartialTable | null>(null);
  
  const { restaurantId } = useAuthStore();
  const queryClient = useQueryClient();

  const handleSaveTable = async (tableData: PartialTable, generateQr: boolean) => {
    if (!restaurantId) return;
    try {
      const payload = {
        table_number: tableData.table_number,
        table_name: tableData.table_name || null,
        capacity: tableData.capacity,
        table_type: tableData.table_type,
        status: tableData.status,
        restaurant_id: restaurantId,
        ...(generateQr && !tableData.id ? { qr_code_url: `https://restaurant-pos.app/qr/${restaurantId}/${tableData.table_number}` } : {})
      };

      if (tableData.id) {
        const { error } = await supabase.from('tables').update(payload).eq('id', tableData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tables').insert([payload]);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      setIsAddDrawerOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save table');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Table Management</h2>
          <p className="text-muted-foreground">Manage your restaurant floor, table statuses, and assignments.</p>
        </div>
        <Button 
          size="lg" 
          className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          onClick={() => {
            setTableToEdit(null);
            setIsAddDrawerOpen(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Table
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables?.map((table) => {
          let statusColor = "border-green-500 bg-green-50/50 text-green-700 shadow-green-500/10";
          let statusBadge = "bg-green-100 text-green-800 hover:bg-green-200";
          
          if (table.status === 'occupied') {
            statusColor = "border-red-500 bg-red-50/50 text-red-700 shadow-red-500/10";
            statusBadge = "bg-red-100 text-red-800 hover:bg-red-200";
          }
          if (table.status === 'reserved') {
            statusColor = "border-yellow-500 bg-yellow-50/50 text-yellow-700 shadow-yellow-500/10";
            statusBadge = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
          }
          if (table.status === 'billing') {
            statusColor = "border-blue-500 bg-blue-50/50 text-blue-700 shadow-blue-500/10";
            statusBadge = "bg-blue-100 text-blue-800 hover:bg-blue-200";
          }

          return (
            <Card 
              key={table.id} 
              className={`border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl rounded-2xl overflow-hidden ${statusColor}`}
              onClick={() => {
                setSelectedTable(table);
                setIsDetailsDrawerOpen(true);
              }}
            >
              <CardHeader className="pb-3 border-b bg-white/50">
                <CardTitle className="text-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">Table {table.table_number}</span>
                    {table.table_name && <span className="text-xs text-muted-foreground font-normal">{table.table_name}</span>}
                  </div>
                  <Badge variant="secondary" className={`uppercase tracking-wider text-[10px] font-bold ${statusBadge}`}>
                    {table.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4"/> Capacity</span>
                  <span className="font-semibold">{table.capacity} pax</span>
                </div>
                
                {table.status !== 'empty' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4"/> Running Time</span>
                      <span className="font-semibold">45 min</span>
                    </div>
                    {table.current_order_id && (
                      <div className="flex items-center justify-between pt-2 border-t border-dashed">
                        <span className="font-medium text-muted-foreground">Running Amount</span>
                        <span className="font-bold text-lg">₹ 1,240</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter className="bg-white/40 p-2 border-t flex justify-between">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                  View Details
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTableToEdit(table);
                    setIsAddDrawerOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {tables?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
          <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No Tables Created</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Start setting up your restaurant floor by adding tables. You can assign numbers, capacities, and generate QR codes.</p>
          <Button 
            size="lg"
            className="rounded-xl shadow-md"
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
      />
    </div>
  );
};
