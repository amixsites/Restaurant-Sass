import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Store, Calendar, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const CreateRestaurant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    plan: 'PRO',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Create the restaurant first
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{
          name: formData.name,
          slug: formData.slug,
          phone: formData.phone,
          address: formData.address,
        }])
        .select('id')
        .single();

      if (restaurantError) throw new Error(`Restaurant creation failed: ${restaurantError.message}`);
      
      const newRestaurantId = restaurant.id;

      // 2. Call the Edge Function to create the Admin User for this restaurant
      const { error: userError } = await supabase.functions.invoke('manage-users', {
        body: {
          email: formData.adminEmail,
          password: formData.adminPassword,
          fullName: 'Restaurant Admin',
          phone: formData.phone,
          role: 'RESTAURANT_ADMIN',
          restaurantId: newRestaurantId
        }
      });

      if (userError) {
        // If user creation fails, we should ideally rollback the restaurant, but keeping it simple for now
        throw new Error(`User creation failed: ${userError.message || 'Check Edge Function logs'}`);
      }
      
      toast({ title: 'Restaurant Created', description: `Restaurant "${formData.name}" and admin user created.` });
      navigate('/super-admin');
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Failed To Create Restaurant', description: error.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Onboard New Restaurant</h2>
          <p className="text-muted-foreground">Create a new tenant, initialize their workspace, and generate admin credentials.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5"/> Restaurant Information</CardTitle>
            <CardDescription>Core details about the business.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input required placeholder="The Burger Joint" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Unique Slug (URL)</Label>
              <Input required placeholder="burger-joint" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input required placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input required placeholder="123 Food Street, City" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5"/> Initial Admin Credentials</CardTitle>
            <CardDescription>These credentials will be securely emailed to the restaurant owner.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input required type="email" placeholder="owner@burgerjoint.com" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input required type="password" placeholder="••••••••" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5"/> Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Plan</Label>
              <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})}
              >
                <option value="STARTER">Starter Plan (?999/mo)</option>
                <option value="PRO">Pro Plan (?2999/mo)</option>
                <option value="ENTERPRISE">Enterprise (Custom)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/super-admin')} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Restaurant & Provision
          </Button>
        </div>
      </form>
    </div>
  );
};


