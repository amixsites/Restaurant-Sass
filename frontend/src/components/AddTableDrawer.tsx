import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';

export type PartialTable = {
  id?: string;
  table_number: string;
  table_name?: string | null;
  capacity: number;
  table_type?: string;
  status: string;
  qr_code_url?: string | null;
  qr_token?: string;
};

interface AddTableDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tableToEdit?: PartialTable | null;
  onSave: (table: PartialTable, generateQr: boolean) => Promise<void>;
}

export const AddTableDrawer = ({ isOpen, onOpenChange, tableToEdit, onSave }: AddTableDrawerProps) => {
  const [formData, setFormData] = useState<PartialTable>({
    table_number: '',
    table_name: '',
    capacity: 4,
    table_type: 'indoor',
    status: 'empty',
  });
  const [generateQr, setGenerateQr] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tableToEdit) {
        setFormData({
          id: tableToEdit.id,
          table_number: tableToEdit.table_number || '',
          table_name: tableToEdit.table_name || '',
          capacity: tableToEdit.capacity || 4,
          table_type: tableToEdit.table_type || 'indoor',
          status: tableToEdit.status || 'empty',
          qr_code_url: tableToEdit.qr_code_url,
        });
        setGenerateQr(false); // Don't auto-regenerate on edit
      } else {
        setFormData({
          table_number: '',
          table_name: '',
          capacity: 4,
          table_type: 'indoor',
          status: 'empty',
        });
        setGenerateQr(true);
      }
    }
  }, [isOpen, tableToEdit]);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSave(formData, generateQr);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving table:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[92dvh]">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-2xl font-bold">
            {tableToEdit ? 'Edit Table' : 'Add New Table'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or edit a restaurant table
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Table Number *</Label>
              <Input 
                value={formData.table_number || ''}
                onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                placeholder="e.g. 101"
                className="h-12 rounded-xl text-base"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Capacity (Pax)</Label>
              <Input 
                type="number"
                value={formData.capacity || 4}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
                className="h-12 rounded-xl text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Table Name (Optional)</Label>
            <Input 
              value={formData.table_name || ''}
              onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
              placeholder="e.g. Window Seat"
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Table Type</Label>
              <Select value={formData.table_type || 'indoor'} onValueChange={(val) => setFormData({ ...formData, table_type: val })}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="balcony">Balcony</SelectItem>
                  <SelectItem value="vip">VIP Room</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status || 'empty'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Empty</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!tableToEdit && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="space-y-0.5">
                <Label>Auto-generate QR Code</Label>
                <p className="text-xs text-muted-foreground">Creates a QR for table ordering</p>
              </div>
              <Switch 
                checked={generateQr}
                onCheckedChange={setGenerateQr}
              />
            </div>
          )}
        </div>

        <DrawerFooter className="px-0 pt-4 border-t">
          <Button 
            size="lg" 
            className="w-full h-14 rounded-xl text-lg font-semibold bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={!formData.table_number.trim() || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {tableToEdit ? 'Update Table' : 'Save Table'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="lg" className="w-full h-14 rounded-xl">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
