import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Receipt, Clock, Users, ArrowRight } from 'lucide-react';
import type { PartialTable } from './AddTableDrawer';
import { useNavigate } from 'react-router-dom';

interface TableDetailsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: PartialTable | null;
}

export const TableDetailsDrawer = ({ isOpen, onOpenChange, table }: TableDetailsDrawerProps) => {
  const navigate = useNavigate();

  if (!table) return null;

  const isOccupied = table.status === 'occupied' || table.status === 'billing';

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[85vh]">
        <DrawerHeader className="px-0 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                Table {table.table_number}
                <Badge variant={isOccupied ? "destructive" : "secondary"} className="uppercase text-[10px]">
                  {table.status}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{table.capacity} Pax</p>
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

            {isOccupied ? (
              <div className="border rounded-xl p-4 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  Running Order Details
                </h3>
                
                <div className="space-y-3">
                  {/* Mock Order Items for visualization until API is connected */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">2x Paneer Tikka</span>
                    <span>₹ 560</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">1x Garlic Naan</span>
                    <span>₹ 80</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">1x Dal Makhani</span>
                    <span>₹ 220</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">2x Fresh Lime Soda</span>
                    <span>₹ 180</span>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">Running Total</p>
                    <p className="text-2xl font-bold">₹ 1,040</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                <p className="text-muted-foreground">Table is currently empty.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="px-0 pt-4 border-t flex-row gap-3">
          {isOccupied && (
            <Button 
              className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-base"
              onClick={() => {
                onOpenChange(false);
                navigate('/admin/billing');
              }}
            >
              Proceed to Billing <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline" className={`h-14 rounded-xl ${isOccupied ? 'flex-[0.5]' : 'w-full'}`}>
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
