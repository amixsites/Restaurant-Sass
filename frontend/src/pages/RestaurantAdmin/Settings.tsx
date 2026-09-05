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
  
  const [savedGST, setSavedGST] = useState(false);
  const [savedCustomerInfo, setSavedCustomerInfo] = useState(false);

  // Fetch restaurant settings
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('customer_info_mode, gst_config, gstin')
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
      if (restaurant.gst_config) {
        setDraftGST({ ...DEFAULT_GST, ...restaurant.gst_config });
      }
      if (restaurant.gstin !== undefined && restaurant.gstin !== null) {
        setDraftGSTIN(restaurant.gstin);
      }
    }
  }, [restaurant]);

  // Check if there are changes
  const hasGSTChanges = restaurant && (
    JSON.stringify(draftGST) !== JSON.stringify(restaurant.gst_config || DEFAULT_GST) ||
    draftGSTIN !== (restaurant.gstin || '')
  );

  const hasCustomerInfoChanges = restaurant && (
    draftCustomerInfoMode !== (restaurant.customer_info_mode || 'name_phone')
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
      if (JSON.stringify(persisted.gst_config) !== JSON.stringify(gst_config) || persisted.gstin !== gstin) {
         throw new Error("Settings could not be verified. Please try again.");
      }
      return persisted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
    }
  });

  const updateCustomerInfoMutation = useMutation({
    mutationFn: async (mode: string) => {
      if (!restaurantId) throw new Error("No restaurant ID found.");
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({ customer_info_mode: mode })
        .eq('id', restaurantId)
        .select('customer_info_mode');
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Unable to save settings. You may not have permission to update this restaurant's settings.");
      }
      
      // Verify persistence
      const persisted = data[0];
      if (persisted.customer_info_mode !== mode) {
         throw new Error("Settings could not be verified. Please try again.");
      }
      return persisted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
    }
  });

  const effectiveTax = draftGST.enabled
    ? draftGST.useIGST
      ? draftGST.igst
      : draftGST.cgst + draftGST.sgst
    : 0;

  const handleSaveGST = async () => {
    try {
      await updateGSTMutation.mutateAsync({ gst_config: draftGST, gstin: draftGSTIN });
      
      setSavedGST(true);
      setTimeout(() => setSavedGST(false), 2500);
      toast({
        title: '✅ Settings Saved',
        description: `GST settings saved successfully.`,
      });
    } catch (err: any) {
      console.error('Failed to save GST settings:', err);
      toast({
        title: '❌ Failed to save settings',
        description: err.message || 'Failed to save GST settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCustomerInfo = async () => {
    try {
      await updateCustomerInfoMutation.mutateAsync(draftCustomerInfoMode);
      
      setSavedCustomerInfo(true);
      setTimeout(() => setSavedCustomerInfo(false), 2500);
      toast({
        title: '✅ Settings Saved',
        description: `Customer information settings saved successfully.`,
      });
    } catch (err: any) {
      console.error('Failed to save Customer Information settings:', err);
      toast({
        title: '❌ Failed to save settings',
        description: err.message || 'Failed to save customer information settings. Please try again.',
        variant: 'destructive',
      });
    }
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
        {/* Card Header */}
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
          {/* Enable / Disable GST */}
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
              {/* CGST + SGST vs IGST toggle */}
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
                /* IGST single field */
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
                  <p className="text-xs text-muted-foreground">
                    Common rates: 5%, 12%, 18%, 28%
                  </p>
                </div>
              ) : (
                /* CGST + SGST two fields */
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

              {/* Live Preview */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Info className="size-3.5" /> Live Preview — ₹1000 order
                </div>
                <div className="space-y-1 text-sm font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>₹1,000.00</span>
                  </div>
                  {draftGST.useIGST ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGST ({draftGST.igst}%)</span>
                      <span>₹{(1000 * draftGST.igst / 100).toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST ({draftGST.cgst}%)</span>
                        <span>₹{(1000 * draftGST.cgst / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST ({draftGST.sgst}%)</span>
                        <span>₹{(1000 * draftGST.sgst / 100).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-black text-foreground border-t border-border pt-1.5 mt-1">
                    <span>Grand Total</span>
                    <span className="text-primary">
                      ₹{(1000 + 1000 * effectiveTax / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* GSTIN */}
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
            <p className="text-xs text-muted-foreground">
              Printed on every invoice. Leave blank to hide.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetGST}
            className="text-muted-foreground hover:text-destructive gap-2"
          >
            <RotateCcw className="size-4" /> Reset to defaults
          </Button>
          <Button
            onClick={handleSaveGST}
            disabled={updateGSTMutation.isPending || !hasGSTChanges}
            className={cn(
              'gap-2 h-11 px-6 rounded-xl font-bold transition-all',
              savedGST
                ? 'bg-green-600 hover:bg-green-600 text-white'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {updateGSTMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Saving...</>
            ) : savedGST ? (
              <><CheckCircle2 className="size-4" /> Saved!</>
            ) : (
              <><Save className="size-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Customer Information Configuration ─────────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-blue-500/10 grid place-items-center">
            <FileText className="size-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Customer Information</h3>
            <p className="text-xs text-muted-foreground">Required details for QR menu ordering</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {[
            { value: 'name_phone', label: 'Name & Mobile Number', desc: 'Require both name and mobile number' },
            { value: 'name_only', label: 'Name Only', desc: 'Require name, omit mobile number' },
            { value: 'phone_only', label: 'Mobile Number Only', desc: 'Require mobile number, omit name' },
            { value: 'none', label: "Don't ask for Name or Mobile Number", desc: 'Skip information form entirely' }
          ].map((option) => (
            <div 
              key={option.value}
              onClick={() => setDraftCustomerInfoMode(option.value)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                draftCustomerInfoMode === option.value 
                  ? "border-primary bg-primary/5" 
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
              </div>
              <div className={cn(
                "size-5 rounded-full border flex items-center justify-center",
                draftCustomerInfoMode === option.value ? "border-primary" : "border-muted-foreground"
              )}>
                {draftCustomerInfoMode === option.value && (
                  <div className="size-2.5 rounded-full bg-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/10">
          <Button
            onClick={handleSaveCustomerInfo}
            disabled={updateCustomerInfoMutation.isPending || !hasCustomerInfoChanges}
            className={cn(
              'gap-2 h-11 px-6 rounded-xl font-bold transition-all',
              savedCustomerInfo
                ? 'bg-green-600 hover:bg-green-600 text-white'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {updateCustomerInfoMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Saving...</>
            ) : savedCustomerInfo ? (
              <><CheckCircle2 className="size-4" /> Saved!</>
            ) : (
              <><Save className="size-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Billing Preferences Info ───────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-amber-500/10 grid place-items-center">
            <BadgeIndianRupee className="size-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Billing Preferences</h3>
            <p className="text-xs text-muted-foreground">Current active configuration</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'GST Status', value: activeGST.enabled ? 'Enabled' : 'Disabled' },
            { label: 'Tax Type', value: activeGST.useIGST ? 'IGST' : 'CGST + SGST' },
            {
              label: 'Total Tax Rate',
              value: activeGST.enabled
                ? `${activeGST.useIGST ? activeGST.igst : activeGST.cgst + activeGST.sgst}%`
                : '0%',
            },
            { label: 'CGST', value: activeGST.enabled && !activeGST.useIGST ? `${activeGST.cgst}%` : '—' },
            { label: 'SGST', value: activeGST.enabled && !activeGST.useIGST ? `${activeGST.sgst}%` : '—' },
            { label: 'GSTIN', value: activeGSTIN || 'Not set' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-sm font-bold text-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── More settings placeholder ──────────────────────────────── */}
      <div className="glass rounded-2xl shadow-card overflow-hidden opacity-60">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-card/20">
          <div className="size-10 rounded-xl bg-muted grid place-items-center">
            <Settings2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">More Settings</h3>
            <p className="text-xs text-muted-foreground">Printer config, WhatsApp, notifications — coming soon</p>
          </div>
        </div>
        <div className="p-5 text-sm text-muted-foreground">
          Additional configuration options will appear here in future updates.
        </div>
      </div>
    </div>
  );
};
