import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Mail, Shield, UserCog, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useStaff } from '@/hooks/api/useStaff';
import { AddStaffDrawer } from '@/components/AddStaffDrawer';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

export const StaffManagement = () => {
  const { data: staff, isLoading } = useStaff();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<any>(null);
  
  const { restaurantId } = useAuthStore();
  const queryClient = useQueryClient();

  const handleSaveStaff = async (staffData: any) => {
    if (!restaurantId) return;
    try {
      if (staffData.id) {
        // Edit Staff details in public.users table (no auth password reset implemented yet)
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
        // Create new Staff using Edge Function
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save staff');
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
    } catch (err) {
      console.error(err);
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
          <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">Manage your employees, assign roles, and control system access.</p>
        </div>
        <Button 
          size="lg"
          className="w-full sm:w-auto rounded-xl bg-primary shadow-lg shadow-primary/20"
          onClick={() => {
            setStaffToEdit(null);
            setIsDrawerOpen(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Staff Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staff?.map((member) => (
          <Card key={member.id} className={`rounded-2xl border-2 transition-all hover:shadow-lg ${member.is_active ? 'border-primary/20' : 'border-muted opacity-80'}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner ${
                    member.role === 'MANAGER' ? 'bg-purple-500' :
                    member.role === 'WAITER' ? 'bg-blue-500' :
                    member.role === 'KITCHEN' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}>
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{member.full_name}</CardTitle>
                    <Badge variant="outline" className={`mt-1 font-bold tracking-wider text-[10px] uppercase ${
                      member.role === 'MANAGER' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                      member.role === 'WAITER' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                      member.role === 'KITCHEN' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                      'border-green-500 text-green-700 bg-green-50'
                    }`}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <Badge variant={member.is_active ? "default" : "secondary"}>
                  {member.is_active ? 'ACTIVE' : 'DISABLED'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 border-b text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Tenant Access Active</span>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-3 flex justify-between gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 rounded-lg text-muted-foreground hover:text-primary"
                onClick={() => {
                  setStaffToEdit(member);
                  setIsDrawerOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button 
                variant={member.is_active ? "ghost" : "default"}
                size="sm" 
                className={`flex-1 rounded-lg ${member.is_active ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : ''}`}
                onClick={() => handleToggleStatus(member.id, member.is_active)}
              >
                {member.is_active ? <><UserX className="w-4 h-4 mr-2" /> Disable</> : <><UserCheck className="w-4 h-4 mr-2" /> Enable</>}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {staff?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
          <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
            <UserCog className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No Staff Members Yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Create accounts for your managers, waiters, and kitchen staff so they can access the POS system.</p>
          <Button 
            size="lg"
            className="rounded-xl shadow-md"
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
