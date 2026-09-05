import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Settings2, Percent, RotateCcw, Save, Receipt,
  BadgeIndianRupee, Info, CheckCircle2, FileText, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';

const DEFAULT_GST = {
  enabled: true,
  cgst: 9,
  sgst: 9,
  igst: 18,
  useIGST: false,
};

export const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;

  // Local draft state — only commit on Save
  const [draftGST, setDraftGST] = useState({ ...DEFAULT_GST });
  const [draftGSTIN, setDraftGSTIN] = useState('');
  const [draftCustomerInfoMode, setDraftCustomerInfoMode] = useState<string>('name_phone');
  const [draftReceiptPreference, setDraftReceiptPreference] = useState<string>('whatsapp');
  
  const [savedGST, setSavedGST] = useState(false);
  const [savedCustomerInfo, setSavedCustomerInfo] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState(false);

  // Fetch restaurant settings
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('customer_info_mode, gst_config, gstin, receipt_preference')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (restaurant) {
      if (restaurant.customer_info_mode) {
        setDraftCustomerInfoMode(restaurant.customer_info_mode);
      }
      if (restaurant.receipt_preference) {
        setDraftReceiptPreference(restaurant.receipt_preference);
      }
      if (restaurant.gst_config) {
        setDraftGST({ ...DEFAULT_GST, ...restaurant.gst_config });
      }
      if (restaurant.gstin !== undefined && restaurant.gstin !== null) {
        setDraftGSTIN(restaurant.gstin);
      }
    }
  }, [restaurant]);

  // Check if there are changes
  const pGst = restaurant?.gst_config || DEFAULT_GST;
  const hasGSTChanges = restaurant && (
    draftGST.enabled !== pGst.enabled ||
    draftGST.useIGST !== pGst.useIGST ||
    draftGST.cgst !== pGst.cgst ||
    draftGST.sgst !== pGst.sgst ||
    draftGST.igst !== pGst.igst ||
    draftGSTIN !== (restaurant.gstin || '')
  );

  const hasCustomerInfoChanges = restaurant && (
    draftCustomerInfoMode !== (restaurant.customer_info_mode || 'name_phone')
  );

  const hasReceiptChanges = restaurant && (
    draftReceiptPreference !== (restaurant.receipt_preference || 'whatsapp')
  );

  const updateGSTMutation = useMutation({
    mutationFn: async ({ gst_config, gstin }: { gst_config: any, gstin: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID found.");
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({ gst_config, gstin })
        .eq('id', restaurantId)
        .select('gst_config, gstin');
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Unable to save settings. You may not have permission to update this restaurant's settings.");
      }
      
      // Verify persistence
      const persisted = data[0];
      const pGst = persisted.gst_config || {};
      const isValidGST = pGst.enabled === gst_config.enabled &&
                         pGst.useIGST === gst_config.useIGST &&
                         pGst.cgst === gst_config.cgst &&
                         pGst.sgst === gst_config.sgst &&
                         pGst.igst === gst_config.igst;
      
      const pGstin = persisted.gstin || '';
      
      if (!isValidGST || pGstin !== gstin) {
         throw new Error("Settings could not be verified. Please try again.");
      }
      return persisted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      setSavedGST(true);
      setTimeout(() => setSavedGST(false), 2500);
      toast({
        title: '✅ Settings Saved',
        description: `GST settings saved successfully.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: '❌ Failed to save settings',
        description: err.message || 'Failed to save GST settings. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const updateCustomerInfoMutation = useMutation({
    mutationFn: async ({ mode }: { mode: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID found.");
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({ customer_info_mode: mode })
        .eq('id', restaurantId)
        .select('customer_info_mode');
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Unable to save settings.");
      }
      if (data[0].customer_info_mode !== mode) {
        throw new Error("Settings could not be verified. Please try again.");
      }
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      setSavedCustomerInfo(true);
      setTimeout(() => setSavedCustomerInfo(false), 2500);
      toast({ title: "✅ Customer info settings saved successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateReceiptMutation = useMutation({
    mutationFn: async ({ preference }: { preference: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID found.");
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({ receipt_preference: preference })
        .eq('id', restaurantId)
        .select('receipt_preference');
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Unable to save receipt settings.");
      }
      if (data[0].receipt_preference !== preference) {
        throw new Error("Settings could not be verified. Please try again.");
      }
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      setSavedReceipt(true);
      setTimeout(() => setSavedReceipt(false), 2500);
      toast({ title: "✅ Receipt settings saved successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed to save receipt settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const effectiveTax = draftGST.enabled
    ? draftGST.useIGST
      ? draftGST.igst
      : draftGST.cgst + draftGST.sgst
    : 0;

  const handleSaveGST = async () => {
    if (!hasGSTChanges) return;
    await updateGSTMutation.mutateAsync({ gst_config: draftGST, gstin: draftGSTIN });
  };

  const handleSaveCustomerInfo = async () => {
    if (!hasCustomerInfoChanges) return;
    await updateCustomerInfoMutation.mutateAsync({ mode: draftCustomerInfoMode });
  };

  const handleSaveReceipt = async () => {
    if (!hasReceiptChanges) return;
    await updateReceiptMutation.mutateAsync({ preference: draftReceiptPreference });
  };

  const handleResetGST = () => {
    setDraftGST({ enabled: true, cgst: 9, sgst: 9, igst: 18, useIGST: false });
    toast({ title: 'Reset to defaults', description: 'GST set back to CGST 9% + SGST 9%.' });
  };

  // Safe fallback for UI rendering
  const activeGST = restaurant?.gst_config || DEFAULT_GST;
  const activeGSTIN = restaurant?.gstin || '';

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Configure GST, tax rates, and billing preferences."
      />

      {/* ── GST Configuration Card ─────────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
            <Percent className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">GST Configuration</h3>
            <p className="text-xs text-muted-foreground">Applied to every invoice generated from billing</p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div>
              <p className="font-semibold text-sm text-foreground">Enable GST on Bills</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When off, no tax is added to invoices
              </p>
            </div>
            <Switch
              checked={draftGST.enabled}
              onCheckedChange={(v) => setDraftGST((d) => ({ ...d, enabled: v }))}
            />
          </div>

          {draftGST.enabled && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">Use IGST (Inter-state)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Switch from CGST+SGST to single IGST rate
                  </p>
                </div>
                <Switch
                  checked={draftGST.useIGST}
                  onCheckedChange={(v) => setDraftGST((d) => ({ ...d, useIGST: v }))}
                />
              </div>

              {draftGST.useIGST ? (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">IGST Rate (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={28}
                      step={0.5}
                      value={draftGST.igst}
                      onChange={(e) =>
                        setDraftGST((d) => ({
                          ...d,
                          igst: Math.min(28, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                      className="pl-9 h-11 rounded-xl text-base font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">CGST Rate (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        max={14}
                        step={0.5}
                        value={draftGST.cgst}
                        onChange={(e) =>
                          setDraftGST((d) => ({
                            ...d,
                            cgst: Math.min(14, Math.max(0, parseFloat(e.target.value) || 0)),
                          }))
                        }
                        className="pl-9 h-11 rounded-xl text-base font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">SGST Rate (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        max={14}
                        step={0.5}
                        value={draftGST.sgst}
                        onChange={(e) =>
                          setDraftGST((d) => ({
                            ...d,
                            sgst: Math.min(14, Math.max(0, parseFloat(e.target.value) || 0)),
                          }))
                        }
                        className="pl-9 h-11 rounded-xl text-base font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              Restaurant GSTIN
            </Label>
            <Input
              placeholder="e.g. 27AAPCS1234M1Z5"
              value={draftGSTIN}
              onChange={(e) => setDraftGSTIN(e.target.value.toUpperCase())}
              className="h-11 rounded-xl font-mono tracking-wider uppercase"
              maxLength={15}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/10">
          <Button variant="ghost" size="sm" onClick={handleResetGST} className="text-muted-foreground hover:text-destructive gap-2">
            <RotateCcw className="size-4" /> Reset to defaults
          </Button>
          <Button
            onClick={handleSaveGST}
            disabled={updateGSTMutation.isPending || !hasGSTChanges}
            className={cn('gap-2 h-11 px-6 rounded-xl font-bold', savedGST ? 'bg-green-600' : 'bg-primary')}
          >
            {updateGSTMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : savedGST ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
            {updateGSTMutation.isPending ? 'Saving...' : savedGST ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* ── Customer Information ─────────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-blue-500/10 grid place-items-center">
            <FileText className="size-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Customer Information</h3>
            <p className="text-xs text-muted-foreground">Required details for QR menu</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {[
            { value: 'name_phone', label: 'Name & Mobile Number' },
            { value: 'name_only', label: 'Name Only' },
            { value: 'phone_only', label: 'Mobile Number Only' },
            { value: 'none', label: "Don't ask" }
          ].map((option) => (
            <div 
              key={option.value}
              onClick={() => setDraftCustomerInfoMode(option.value)}
              className={cn("flex items-center justify-between p-4 rounded-xl border cursor-pointer", draftCustomerInfoMode === option.value ? "border-primary bg-primary/5" : "border-border")}
            >
              <span className="font-medium text-sm">{option.label}</span>
              <div className={cn("size-5 rounded-full border flex items-center justify-center", draftCustomerInfoMode === option.value ? "border-primary" : "border-muted")}>
                {draftCustomerInfoMode === option.value && <div className="size-2.5 rounded-full bg-primary" />}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/10">
          <Button onClick={handleSaveCustomerInfo} disabled={updateCustomerInfoMutation.isPending || !hasCustomerInfoChanges} className={cn('gap-2 h-11 px-6 rounded-xl font-bold', savedCustomerInfo ? 'bg-green-600' : 'bg-primary')}>
            {updateCustomerInfoMutation.isPending ? 'Saving...' : savedCustomerInfo ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* ── Receipt Preference ─────────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-purple-500/10 grid place-items-center">
            <Receipt className="size-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Receipt Preferences</h3>
            <p className="text-xs text-muted-foreground">Choose how bills are handled after payment.</p>
          </div>
        </div>
        
        <div className="p-5 space-y-3">
          <div className="text-sm font-bold text-foreground mb-3">After payment</div>
          {[
            { value: 'print', label: 'Print Receipt', desc: 'Open the Windows print dialog to print the bill.' },
            { value: 'whatsapp', label: 'Send Bill on WhatsApp', desc: 'Send the bill using the existing WhatsApp flow.' },
            { value: 'print_whatsapp', label: 'Print Receipt & WhatsApp', desc: 'Make both receipt options available.' }
          ].map((option) => (
            <div 
              key={option.value}
              onClick={() => setDraftReceiptPreference(option.value)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all", 
                draftReceiptPreference === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
              </div>
              <div className={cn("size-5 rounded-full border flex items-center justify-center shrink-0 ml-4", draftReceiptPreference === option.value ? "border-primary" : "border-muted-foreground")}>
                {draftReceiptPreference === option.value && <div className="size-2.5 rounded-full bg-primary" />}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/10">
          <Button onClick={handleSaveReceipt} disabled={updateReceiptMutation.isPending || !hasReceiptChanges} className={cn('gap-2 h-11 px-6 rounded-xl font-bold', savedReceipt ? 'bg-green-600' : 'bg-primary')}>
            {updateReceiptMutation.isPending ? 'Saving...' : savedReceipt ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};
