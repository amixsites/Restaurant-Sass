import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Receipt, Clock, Users, ArrowRight, Table as TableIcon } from 'lucide-react';
import type { PartialTable } from './AddTableDrawer';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/hooks/api/useOrders';
import { useMemo, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface TableDetailsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: PartialTable | null;
  onDelete?: (tableId: string) => Promise<void>;
}

export const TableDetailsDrawer = ({ isOpen, onOpenChange, table, onDelete }: TableDetailsDrawerProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    logger.debug('TABLES', 'STATE_UPDATE', 'Drawer state changed', { isOpen, tableId: table?.id });
  }, [isOpen, table]);

  const { data: orders, isLoading: isOrdersLoading } = useOrders();

  const activeOrder = useMemo(() => {
    if (!table?.id || !orders) return null;
    return orders.find(o => o.table_id === table.id && !['COMPLETED', 'CANCELLED'].includes(o.status));
  }, [table?.id, orders]);

  const isOccupied = !!activeOrder;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[85vh]">
        {!table ? (
          <div className="flex flex-col items-center justify-center p-10 text-center min-h-[400px]">
             <TableIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
             <h3 className="text-xl font-bold">No Table Selected</h3>
             <p className="text-muted-foreground mt-2">Select a table to view details.</p>
             <DrawerClose asChild className="mt-8">
                <Button variant="outline" className="rounded-xl">Close Panel</Button>
             </DrawerClose>
          </div>
        ) : (
          <>
            <DrawerHeader className="px-0 pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                    Table {table.table_number || 'Unknown'}
                    <Badge variant={isOccupied ? "destructive" : "secondary"} className="uppercase text-[10px]">
                      {activeOrder?.status || table.status || 'UNKNOWN'}
                    </Badge>
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    View table details and orders
                  </DrawerDescription>
                  {table.table_name && <p className="text-muted-foreground text-sm mt-1">{table.table_name}</p>}
                </div>
              </div>
            </DrawerHeader>
            
            <ScrollArea className="flex-1 py-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <p className="font-semibold">{table.capacity || '0'} Pax</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{table.table_type || 'Indoor'}</p>
                    </div>
                  </div>
                </div>

                {isOrdersLoading ? (
                  <div className="border rounded-xl p-8 space-y-4 text-center animate-pulse bg-muted/20">
                     <div className="h-6 bg-muted rounded w-1/3 mx-auto mb-4"></div>
                     <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                     <div className="h-4 bg-muted rounded w-2/5 mx-auto"></div>
                  </div>
                ) : activeOrder ? (
                  <div className="border rounded-xl p-4 space-y-4 shadow-sm">
                    <h3 className="font-bold flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      Running Order Details
                    </h3>
                    
                    <div className="space-y-3">
                      {activeOrder.order_items?.length ? activeOrder.order_items.map((item) => {
                        let statusColor = "text-muted-foreground";
                        let statusLabel = item.status || 'UNKNOWN';
                        
                        if (item.status === 'PENDING') statusColor = "text-yellow-600 font-medium";
                        if (item.status === 'PREPARING') statusColor = "text-orange-600 font-medium";
                        if (item.status === 'READY') statusColor = "text-green-600 font-medium";
                        if (item.status === 'SERVED') statusColor = "text-blue-600 font-medium";

                        return (
                          <div key={item.id || Math.random()} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                            <div>
                              <div className="font-medium">{item.quantity || 1}x {item.menu_items?.name || 'Unknown Item'}</div>
                              <div className={`text-xs ${statusColor}`}>{statusLabel}</div>
                            </div>
                            <span className="font-semibold">₹ {item.total_price || 0}</span>
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground italic">No items found in this order.</p>
                      )}
                    </div>

                    <div className="pt-4 border-t flex justify-between items-end">
                      <div>
                        <p className="text-xs text-muted-foreground">Running Total</p>
                        <p className="text-2xl font-bold">₹ {activeOrder.total_amount || 0}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed shadow-sm">
                    <p className="text-muted-foreground">Table is currently empty.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DrawerFooter className="px-0 pt-4 border-t flex flex-col sm:flex-row gap-3">
              {onDelete && table.id && (
                <Button 
                  variant="destructive"
                  className="h-14 rounded-xl text-base shadow-sm"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete Table ${table.table_number}? This will also permanently delete its QR code.`)) {
                      await onDelete(table.id);
                      onOpenChange(false);
                    }
                  }}
                >
                  Delete Table
                </Button>
              )}
              {isOccupied && (
                <Button 
                  className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-base shadow-md"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/admin/billing');
                  }}
                >
                  Proceed to Billing <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" className={`h-14 rounded-xl shadow-sm ${isOccupied ? 'flex-[0.5]' : 'flex-1'}`}>
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

