import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Receipt, Download, Printer, Share2, MapPin, Phone,
  Mail, Globe, AlertCircle, Loader2, CheckCircle2,
  XCircle, Clock, User, Hash, CreditCard, Calendar,
  FileText, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  restaurant_id: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

interface Order {
  id: string;
  customer_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  tables?: {
    table_number: number;
  }[];
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    menu_items: {
      name: string;
      description: string | null;
    };
  }>;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  // Optional fields that may be added to DB later:
  email?: string | null;
  website?: string | null;
  gst_number?: string | null;
  logo_url?: string | null;
}

export const BillPage = () => {
  const { billId } = useParams<{ billId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!billId) {
      setError('Invalid bill ID');
      setLoading(false);
      return;
    }

    fetchBillData();
  }, [billId]);

  const fetchBillData = async () => {
    try {
      setLoading(true);
      logger.start('BILLING', 'FETCH', `Fetching bill data for: ${billId}`);

      // ── Step 1: Fetch Invoice ──────────────────────────────────────
      // Detect UUID vs invoice_number format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billId ?? '');
      const primaryField = isUUID ? 'id' : 'invoice_number';

      let { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq(primaryField, billId)
        .maybeSingle();

      // Fallback: if UUID lookup returned nothing, try invoice_number
      if (!invoiceData && !invoiceError && isUUID) {
        const fallback = await supabase
          .from('invoices')
          .select('*')
          .eq('invoice_number', billId)
          .maybeSingle();
        invoiceData = fallback.data;
        invoiceError = fallback.error;
      }

      if (invoiceError) throw new Error(`Invoice fetch failed: ${invoiceError.message}`);
      if (!invoiceData) {
        setError('Bill not found. The link may be expired or invalid.');
        setLoading(false);
        return;
      }
      setInvoice(invoiceData);

      // ── Step 2: Fetch Order (flat, no joins) ───────────────────────
      const { data: orderBase, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_phone, notes, status, created_at, table_id')
        .eq('id', invoiceData.order_id)
        .single();

      if (orderError) throw new Error(`Order fetch failed: ${orderError.message}`);

      // ── Step 3: Fetch Table (separate query, no ambiguity) ─────────
      let tableData: { table_number: number } | null = null;
      if (orderBase?.table_id) {
        const { data: tbl } = await supabase
          .from('tables')
          .select('table_number')
          .eq('id', orderBase.table_id)
          .maybeSingle();
        tableData = tbl;
      }

      // ── Step 4: Fetch Order Items (flat) ───────────────────────────
      const { data: itemsRaw, error: itemsError } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, total_price, notes, menu_item_id')
        .eq('order_id', invoiceData.order_id);

      if (itemsError) throw new Error(`Order items fetch failed: ${itemsError.message}`);

      // ── Step 5: Fetch Menu Item Names ──────────────────────────────
      const menuItemIds = [...new Set((itemsRaw ?? []).map((i: any) => i.menu_item_id).filter(Boolean))];
      let menuMap: Record<string, { name: string; description: string | null }> = {};

      if (menuItemIds.length > 0) {
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('id, name, description')
          .in('id', menuItemIds);
        (menuItems ?? []).forEach((m: any) => { menuMap[m.id] = m; });
      }

      // ── Step 6: Fetch Restaurant ───────────────────────────────────
      // Use * so we get all columns that exist — optional fields will simply be null
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, slug, address, phone')
        .eq('id', invoiceData.restaurant_id)
        .single();

      if (restaurantError) throw new Error(`Restaurant fetch failed: ${restaurantError.message}`);

      // ── Assemble Order object ──────────────────────────────────────
      const assembledOrder: Order = {
        id: orderBase.id,
        customer_phone: orderBase.customer_phone,
        notes: orderBase.notes,
        status: orderBase.status,
        created_at: orderBase.created_at,
        tables: tableData ? [tableData] : undefined,
        order_items: (itemsRaw ?? []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes,
          menu_items: menuMap[item.menu_item_id] ?? { name: 'Item', description: null },
        })),
      };

      setOrder(assembledOrder);
      setRestaurant(restaurantData);

      logger.success('BILLING', 'FETCH', 'Bill data loaded successfully');
    } catch (err: any) {
      logger.error('BILLING', 'FETCH', err);
      console.error('BillPage full error:', err);
      setError(err.message || 'Failed to load bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print(); // Browser's print-to-PDF functionality
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `View my bill from ${restaurant?.name || 'Restaurant'} - ₹${invoice?.total_amount.toFixed(2)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Restaurant Bill', text, url });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Bill link copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return {
          label: 'Paid',
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'refunded':
        return {
          label: 'Refunded',
          icon: XCircle,
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      default:
        return {
          label: 'Pending',
          icon: Clock,
          className: 'bg-orange-100 text-orange-800 border-orange-300',
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-semibold text-muted-foreground">Loading your bill...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invoice || !order || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass rounded-3xl p-8 text-center space-y-6 border-2 border-destructive/20">
            <div className="size-20 rounded-full bg-destructive/10 grid place-items-center mx-auto">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground mb-2">Bill Not Found</h1>
              <p className="text-muted-foreground">
                {error || 'The bill you\'re looking for doesn\'t exist or has expired.'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Need help?</p>
              <p className="text-sm font-semibold">Contact restaurant support</p>
            </div>
            <Link to="/">
              <Button className="w-full gap-2 h-12 rounded-xl">
                <Home className="size-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paymentStatus = getPaymentStatusConfig(invoice.payment_status);
  const StatusIcon = paymentStatus.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Action Bar - No Print */}
      <div className="no-print sticky top-0 z-50 glass border-b border-border/50 backdrop-blur-xl">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
              <Receipt className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-sm text-foreground">Tax Invoice</h2>
              <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2 rounded-xl hidden sm:flex"
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-2 rounded-xl"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-2 rounded-xl bg-primary"
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Invoice Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="glass rounded-3xl overflow-hidden border border-border/50 shadow-2xl bg-card">
          
          {/* Header Section */}
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/50 p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Restaurant Info */}
              <div className="flex items-start gap-4">
                {restaurant.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="size-16 md:size-20 rounded-2xl object-cover border-2 border-border shadow-sm"
                  />
                ) : (
                  <div className="size-16 md:size-20 rounded-2xl bg-primary/10 grid place-items-center border-2 border-primary/20">
                    <Receipt className="size-8 md:size-10 text-primary" />
                  </div>
                )}
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-black text-foreground leading-none">
                    {restaurant.name}
                  </h1>
                  {restaurant.address && (
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <MapPin className="size-4 mt-0.5 shrink-0" />
                      <span className="max-w-xs">{restaurant.address}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {restaurant.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5" />
                        {restaurant.phone}
                      </span>
                    )}
                    {restaurant.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        {restaurant.email}
                      </span>
                    )}
                    {restaurant.website && (
                      <span className="flex items-center gap-1.5">
                        <Globe className="size-3.5" />
                        {restaurant.website}
                      </span>
                    )}
                  </div>
                  {restaurant.gst_number && (
                    <p className="text-xs font-bold text-foreground">
                      GSTIN: {restaurant.gst_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Badge */}
              <div className="flex flex-col items-start md:items-end gap-2">
                <Badge className="text-xs font-black uppercase px-3 py-1.5 bg-foreground text-background">
                  Tax Invoice
                </Badge>
                <Badge className={cn('text-xs font-bold px-3 py-1 border', paymentStatus.className)}>
                  <StatusIcon className="size-3.5 mr-1.5" />
                  {paymentStatus.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bill Information Card */}
          <div className="p-8 border-b border-border/50 bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <Hash className="size-3.5" />
                  Bill Number
                </div>
                <p className="text-sm font-black font-mono text-foreground">
                  {invoice.invoice_number}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <Calendar className="size-3.5" />
                  Date & Time
                </div>
                <p className="text-sm font-bold text-foreground">
                  {formatDate(invoice.created_at)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <FileText className="size-3.5" />
                  Table
                </div>
                <p className="text-sm font-bold text-foreground">
                   {order.tables?.[0]?.table_number ? `T-${order.tables[0].table_number}` : 'Takeaway'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <User className="size-3.5" />
                  Customer
                </div>
                <p className="text-sm font-bold text-foreground">
                  {order.notes ? order.notes.replace('Customer: ', '') : 'Walk-in Guest'}
                </p>
              </div>

              {order.customer_phone && (
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <Phone className="size-3.5" />
                    Customer Phone
                  </div>
                  <p className="text-sm font-bold text-foreground font-mono">
                    {order.customer_phone}
                  </p>
                </div>
              )}

              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <Hash className="size-3.5" />
                  Order ID
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {order.id}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="p-8 border-b border-border/50">
            <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Order Items
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-3 px-2 text-xs font-black text-muted-foreground uppercase tracking-wider">
                      Item Description
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-black text-muted-foreground uppercase tracking-wider w-20">
                      Qty
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-black text-muted-foreground uppercase tracking-wider w-24">
                      Unit Price
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-black text-muted-foreground uppercase tracking-wider w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {order.order_items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-bold text-foreground">{item.menu_items.name}</p>
                          {item.notes && (
                            <p className="text-xs text-orange-600 mt-1 italic">✦ {item.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground font-mono">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-black text-foreground font-mono">
                        ₹{Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="p-8 bg-muted/10">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({order.order_items.length} items)</span>
                <span className="font-bold text-foreground font-mono">
                  ₹{Number(invoice.subtotal).toFixed(2)}
                </span>
              </div>

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-rose-600 font-bold">
                  <span>Discount</span>
                  <span className="font-mono">
                    -₹{Number(invoice.discount_amount).toFixed(2)}
                  </span>
                </div>
              )}

              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST Taxes</span>
                  <span className="font-bold text-foreground font-mono">
                    ₹{Number(invoice.tax_amount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t-2 border-border">
                <span className="text-base font-black text-foreground uppercase">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-primary font-mono">
                  ₹{Number(invoice.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="p-8 border-t border-border/50 bg-card">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
                  Payment Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="text-sm font-bold text-foreground uppercase">
                        {invoice.payment_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Date</p>
                      <p className="text-sm font-bold text-foreground">
                        {formatDate(invoice.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-end">
                <Badge
                  className={cn(
                    'text-base font-black px-6 py-3 border-2',
                    paymentStatus.className
                  )}
                >
                  <StatusIcon className="size-5 mr-2" />
                  {paymentStatus.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Thank You Section */}
          <div className="p-8 border-t border-border/50 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 text-center">
            <h3 className="text-lg font-black text-foreground mb-2">
              Thank You for Dining With Us!
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              We sincerely appreciate your visit and look forward to serving you again.
              For any queries or support, please contact us at the details above.
            </p>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-border/50 bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {restaurant.name}. All Rights Reserved.
            </p>
            {restaurant.address && (
              <p className="text-xs text-muted-foreground mt-1">{restaurant.address}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 font-semibold">
              Powered by DineSwift POS
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .glass {
            background: white !important;
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
};
