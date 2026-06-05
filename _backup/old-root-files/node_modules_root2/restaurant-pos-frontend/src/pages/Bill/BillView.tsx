/**
 * Digital Restaurant Bill Page
 * 
 * Professional invoice-style bill display for customers
 * Accessible via: https://dineinflowd.vercel.app/bill/{bill_id}
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Printer, Share2, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { generateWhatsAppLink } from '@/lib/whatsapp-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BillData {
  id: string;
  invoice_number: string;
  order_id: string;
  restaurant_id: string;
  table_id: string;
  customer_name?: string;
  guests_count?: number;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  service_charge: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  transaction_id?: string;
  created_at: string;
  paid_at?: string;
  
  // Relations
  restaurant: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    logo_url?: string;
  };
  table: {
    table_number: string;
  };
  items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
    menu_item: {
      name: string;
    };
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BillView() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch Bill Data
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchBill() {
      if (!billId) {
        setError('Invalid bill ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select(`
            *,
            restaurant:restaurants(name, slug, address, phone, email, website, gstin, logo_url),
            table:tables(table_number),
            items:invoice_items(
              id,
              menu_item_id,
              quantity,
              unit_price,
              total_price,
              notes,
              menu_item:menu_items(name)
            )
          `)
          .eq('id', billId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Bill not found');

        setBill(data as unknown as BillData);
      } catch (err) {
        console.error('Error fetching bill:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    }

    fetchBill();
  }, [billId]);

  // ───────────────────────────────────────────────────────────────────────────
  // Actions
  // ───────────────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, trigger print dialog (user can save as PDF)
    // TODO: Integrate PDF generation library
    window.print();
    toast({
      title: 'PDF Download',
      description: 'Use Print > Save as PDF to download your bill',
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill #${bill?.invoice_number}`,
          text: `View your bill from ${bill?.restaurant.name}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied',
        description: 'Bill link copied to clipboard',
      });
    }
  };

  const handleSendWhatsApp = () => {
    if (!bill) return;
    
    const message = `Here is your bill from ${bill.restaurant.name}\n\nBill #${bill.invoice_number}\nAmount: ₹${bill.total_amount.toFixed(2)}\n\nView: ${window.location.href}`;
    
    const whatsappUrl = generateWhatsAppLink({
      phoneNumber: '', // Empty will prompt user to choose contact
      message: message,
    });
    
    window.open(whatsappUrl, '_blank');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your bill...</p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Error State
  // ───────────────────────────────────────────────────────────────────────────

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Bill Not Found</h1>
            <p className="text-muted-foreground">
              {error || 'The bill you are looking for does not exist or has been removed.'}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the restaurant directly.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Bill Display
  // ───────────────────────────────────────────────────────────────────────────

  const paymentStatusConfig = {
    PAID: { label: 'Paid', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-200' },
    PARTIAL: { label: 'Partial Payment', icon: Clock, className: 'bg-orange-500/10 text-orange-600 border-orange-200' },
    PENDING: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
    UNPAID: { label: 'Unpaid', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-200' },
  };

  const status = paymentStatusConfig[bill.payment_status as keyof typeof paymentStatusConfig] 
    || paymentStatusConfig.PENDING;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Action Bar (No Print) */}
      <div className="no-print sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Bill Content */}
      <div className="print-content max-w-4xl mx-auto p-4 md:p-8 py-8">
        <Card className="p-6 md:p-10 space-y-8 shadow-xl">
          
          {/* Header */}
          <div className="text-center space-y-4 border-b pb-6">
            {bill.restaurant.logo_url && (
              <img 
                src={bill.restaurant.logo_url} 
                alt={bill.restaurant.name}
                className="h-16 mx-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{bill.restaurant.name}</h1>
              {bill.restaurant.address && (
                <p className="text-sm text-muted-foreground mt-2">{bill.restaurant.address}</p>
              )}
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                {bill.restaurant.phone && <span>📞 {bill.restaurant.phone}</span>}
                {bill.restaurant.email && <span>✉️ {bill.restaurant.email}</span>}
              </div>
              {bill.restaurant.gstin && (
                <p className="text-xs text-muted-foreground mt-1">GSTIN: {bill.restaurant.gstin}</p>
              )}
            </div>
          </div>

          {/* Bill Info Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground">Bill Number</p>
              <p className="font-semibold">{bill.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-semibold">
                {new Date(bill.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(bill.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Table</p>
              <p className="font-semibold">{bill.table.table_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <Badge variant="outline" className={status.className}>
                <status.icon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>

          {bill.customer_name && (
            <div className="text-sm">
              <span className="text-muted-foreground">Customer: </span>
              <span className="font-medium">{bill.customer_name}</span>
              {bill.guests_count && (
                <span className="text-muted-foreground ml-4">
                  Guests: {bill.guests_count}
                </span>
              )}
            </div>
          )}

          {/* Items Table */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left text-sm">
                    <th className="p-3">Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bill.items.map((item) => (
                    <tr key={item.id} className="text-sm">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.menu_item.name}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">₹{item.unit_price.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">₹{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="space-y-3">
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{bill.subtotal.toFixed(2)}</span>
              </div>
              
              {bill.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- ₹{bill.discount.toFixed(2)}</span>
                </div>
              )}
              
              {bill.service_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-medium">₹{bill.service_charge.toFixed(2)}</span>
                </div>
              )}
              
              {bill.cgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-medium">₹{bill.cgst.toFixed(2)}</span>
                </div>
              )}
              
              {bill.sgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-medium">₹{bill.sgst.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-primary">₹{bill.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          {bill.payment_status === 'PAID' && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium uppercase">{bill.payment_method.replace('_', ' ')}</span>
              </div>
              {bill.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{bill.transaction_id}</span>
                </div>
              )}
              {bill.paid_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span>{new Date(bill.paid_at).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          {/* Thank You Message */}
          <div className="text-center space-y-4 border-t pt-6">
            <p className="text-lg font-medium">Thank you for dining with us! 🍽️</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We sincerely appreciate your visit and look forward to serving you again.
            </p>
            
            {bill.restaurant.phone && (
              <p className="text-xs text-muted-foreground">
                For any queries, contact us at {bill.restaurant.phone}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>© {new Date().getFullYear()} {bill.restaurant.name}. All Rights Reserved.</p>
            {bill.restaurant.website && (
              <p className="mt-1">{bill.restaurant.website}</p>
            )}
          </div>

        </Card>
      </div>
    </div>
  );
}

export default BillView;
