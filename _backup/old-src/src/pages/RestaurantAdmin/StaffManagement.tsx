import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Mail, Shield, UserCog, UserCheck, UserX, Loader2, Search } from 'lucide-react';
import { useStaff } from '@/hooks/api/useStaff';
import { AddStaffDrawer } from '@/components/AddStaffDrawer';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

const roleMeta: Record<string, { label: string; bg: string; text: string }> = {
  MANAGER: { label: 'Manager', bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600', text: 'from-purple-500 to-purple-600' },
  WAITER: { label: 'Waiter', bg: 'bg-blue-500/10 border-blue-500/20 text-blue-600', text: 'from-blue-500 to-blue-600' },
  KITCHEN: { label: 'Kitchen', bg: 'bg-orange-500/10 border-orange-500/20 text-orange-600', text: 'from-orange-500 to-orange-655' },
  ADMIN: { label: 'Admin', bg: 'bg-green-500/10 border-green-500/20 text-green-600', text: 'from-green-500 to-green-600' },
};

export const StaffManagement = () => {
  const { data: staff, isLoading } = useStaff();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { restaurantId } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSaveStaff = async (staffData: any) => {
    if (!restaurantId) return;
    try {
      if (staffData.id) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: staffData.full_name,
            role: staffData.role,
            is_active: staffData.is_active
          })
          .eq('id', staffData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'create_user',
            email: staffData.email,
            password: staffData.password,
            metadata: {
              full_name: staffData.full_name,
              restaurant_id: restaurantId,
              role: staffData.role
            }
          }
        });

        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      setIsDrawerOpen(false);
      toast({ title: staffData.id ? 'Staff Updated' : 'Staff Created', description: 'Staff profile saved successfully.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed To Save Staff', description: err.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      toast({ title: 'Staff Updated', description: `Staff member ${!currentStatus ? 'enabled' : 'disabled'}.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Update Failed', description: 'Unable to update staff status.', variant: 'destructive' });
    }
  };

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter(member => {
      const nameMatch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const roleMatch = member.role.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || emailMatch || roleMatch;
    });
  }, [staff, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Staff Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Staff Management"
        subtitle="Manage employees, roles, and terminal login access."
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl bg-card/60 border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
            </div>
            <Button
              className="rounded-xl bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow shrink-0 h-10"
              onClick={() => {
                setStaffToEdit(null);
                setIsDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Staff
            </Button>
          </div>
        }
      />

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStaff.map((member) => {
          const role = member.role || 'WAITER';
          const meta = roleMeta[role] || roleMeta['WAITER'];
          const initial = member.full_name.charAt(0).toUpperCase();

          return (
            <div
              key={member.id}
              className={cn(
                'glass rounded-2xl p-5 hover-lift shadow-card flex flex-col justify-between',
                !member.is_active && 'opacity-65 border-dashed'
              )}
            >
              <div>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'size-14 rounded-2xl bg-gradient-to-br grid place-items-center text-white font-black text-xl shadow-glow shrink-0',
                    meta.text
                  )}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate text-foreground">{member.full_name}</h3>
                      <span className={cn(
                        'text-[9px] uppercase font-bold border px-2 py-0.5 rounded-full',
                        meta.bg
                      )}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <span className={cn(
                        'size-1.5 rounded-full',
                        member.is_active ? 'bg-success' : 'bg-muted-foreground'
                      )} />
                      <span>{member.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t border-border/40 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground/75 shrink-0" />
                    <span className="truncate text-foreground/80">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5 text-muted-foreground/75 shrink-0" />
                    <span>Access Role: {role.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-border/40 flex justify-between gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-9 rounded-xl text-muted-foreground hover:text-foreground font-semibold"
                  onClick={() => {
                    setStaffToEdit(member);
                    setIsDrawerOpen(true);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  variant={member.is_active ? 'ghost' : 'default'}
                  size="sm"
                  className={cn(
                    'flex-1 h-9 rounded-xl font-semibold',
                    member.is_active ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'bg-primary text-white hover:opacity-95'
                  )}
                  onClick={() => handleToggleStatus(member.id, member.is_active)}
                >
                  {member.is_active ? (
                    <><UserX className="w-3.5 h-3.5 mr-1.5" /> Disable</>
                  ) : (
                    <><UserCheck className="w-3.5 h-3.5 mr-1.5" /> Enable</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-card/20 shadow-inner">
          <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
            <UserCog className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-foreground">No Staff Members Found</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">Create accounts for managers, waiters, and kitchen teams to log in and use DineSwift.</p>
          <Button
            className="rounded-xl shadow-md bg-primary hover:opacity-95 text-white font-bold"
            onClick={() => {
              setStaffToEdit(null);
              setIsDrawerOpen(true);
            }}
          >
            <Plus className="w-5 h-5 mr-2" /> Add Staff Member
          </Button>
        </div>
      )}

      <AddStaffDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        staffToEdit={staffToEdit}
        onSave={handleSaveStaff}
      />
    </div>
  );
};
