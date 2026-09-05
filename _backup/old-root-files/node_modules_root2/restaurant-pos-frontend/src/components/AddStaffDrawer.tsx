import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface AddStaffDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  staffToEdit?: any | null;
  onSave: (staffData: any) => Promise<void>;
}

export const AddStaffDrawer = ({ isOpen, onOpenChange, staffToEdit, onSave }: AddStaffDrawerProps) => {
  const [formData, setFormData] = useState({
    id: staffToEdit?.id || '',
    full_name: staffToEdit?.full_name || '',
    email: staffToEdit?.email || '',
    password: '',
    role: staffToEdit?.role || 'WAITER',
    is_active: staffToEdit?.is_active ?? true,
    phone_number: staffToEdit?.phone_number || '', // If you add phone_number column later
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    logger.start('STAFF', 'VALIDATE_FORM', 'Validating staff form', formData);
    try {
      setIsSubmitting(true);
      await onSave(formData);
      onOpenChange(false);
    } catch (error: any) {
      logger.error('STAFF', 'SAVE_STAFF_DRAWER_ERROR', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem]">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-2xl font-bold">
            {staffToEdit ? 'Edit Staff Member' : 'Add New Staff'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or edit a staff member
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 custom-scrollbar">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input 
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. John Doe"
              className="h-12 rounded-xl text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@restaurant.com"
              className="h-12 rounded-xl text-base"
              disabled={!!staffToEdit}
              required
            />
            {staffToEdit && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
          </div>

          {!staffToEdit && (
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Secure password"
                className="h-12 rounded-xl text-base"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>System Role</Label>
            <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="WAITER">Waiter</SelectItem>
                <SelectItem value="KITCHEN">Kitchen Staff</SelectItem>
                <SelectItem value="CASHIER">Cashier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="space-y-0.5">
              <Label>Active Status</Label>
              <p className="text-xs text-muted-foreground">Allow staff to log into the system</p>
            </div>
            <Switch 
              checked={formData.is_active}
              onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
            />
          </div>
        </div>

        <DrawerFooter className="px-0 pt-4 border-t">
          <Button 
            size="lg" 
            className="w-full h-14 rounded-xl text-lg font-semibold"
            onClick={handleSave}
            disabled={!formData.full_name.trim() || (!staffToEdit && !formData.password.trim()) || !formData.email.trim() || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {staffToEdit ? 'Update Staff' : 'Create Staff Member'}
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
