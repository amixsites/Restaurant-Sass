import { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Settings2, Percent, RotateCcw, Save, Receipt,
  BadgeIndianRupee, Info, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Settings = () => {
  const { gst, restaurantGSTIN, setGST, setGSTIN, resetGST } = useSettingsStore();
  const { toast } = useToast();

  // Local draft state — only commit on Save
  const [draft, setDraft] = useState({ ...gst });
  const [draftGSTIN, setDraftGSTIN] = useState(restaurantGSTIN);
  const [saved, setSaved] = useState(false);

  const effectiveTax = draft.enabled
    ? draft.useIGST
      ? draft.igst
      : draft.cgst + draft.sgst
    : 0;

  const handleSave = () => {
    setGST(draft);
    setGSTIN(draftGSTIN);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast({
      title: '✅ Settings Saved',
      description: `GST updated — ${draft.enabled ? `${effectiveTax}% total tax` : 'GST disabled'}.`,
    });
  };

  const handleReset = () => {
    resetGST();
    setDraft({ enabled: true, cgst: 9, sgst: 9, igst: 18, useIGST: false });
    toast({ title: 'Reset to defaults', description: 'GST set back to CGST 9% + SGST 9%.' });
  };

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
              checked={draft.enabled}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
            />
          </div>

          {draft.enabled && (
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
                  checked={draft.useIGST}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, useIGST: v }))}
                />
              </div>

              {draft.useIGST ? (
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
                      value={draft.igst}
                      onChange={(e) =>
                        setDraft((d) => ({
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
                        value={draft.cgst}
                        onChange={(e) =>
                          setDraft((d) => ({
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
                        value={draft.sgst}
                        onChange={(e) =>
                          setDraft((d) => ({
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
                  {draft.useIGST ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGST ({draft.igst}%)</span>
                      <span>₹{(1000 * draft.igst / 100).toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST ({draft.cgst}%)</span>
                        <span>₹{(1000 * draft.cgst / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST ({draft.sgst}%)</span>
                        <span>₹{(1000 * draft.sgst / 100).toFixed(2)}</span>
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
            onClick={handleReset}
            className="text-muted-foreground hover:text-destructive gap-2"
          >
            <RotateCcw className="size-4" /> Reset to defaults
          </Button>
          <Button
            onClick={handleSave}
            className={cn(
              'gap-2 h-11 px-6 rounded-xl font-bold transition-all',
              saved
                ? 'bg-green-600 hover:bg-green-600 text-white'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {saved ? (
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
            { label: 'GST Status', value: gst.enabled ? 'Enabled' : 'Disabled' },
            { label: 'Tax Type', value: gst.useIGST ? 'IGST' : 'CGST + SGST' },
            {
              label: 'Total Tax Rate',
              value: gst.enabled
                ? `${gst.useIGST ? gst.igst : gst.cgst + gst.sgst}%`
                : '0%',
            },
            { label: 'CGST', value: gst.enabled && !gst.useIGST ? `${gst.cgst}%` : '—' },
            { label: 'SGST', value: gst.enabled && !gst.useIGST ? `${gst.sgst}%` : '—' },
            { label: 'GSTIN', value: restaurantGSTIN || 'Not set' },
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
