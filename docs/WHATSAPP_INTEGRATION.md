# WhatsApp Integration Guide

**Version:** 1.0  
**Date:** June 5, 2026  
**Module:** Bill Sharing & Customer Communication

---

## 📋 Overview

Professional WhatsApp integration for sharing digital restaurant bills with customers. Includes utilities for generating bill URLs, formatting messages, and creating Click-to-Chat links.

---

## 🚀 Quick Start

### **Import Utilities**
```typescript
import {
  generateBillUrl,
  generateWhatsAppMessage,
  generateWhatsAppLink,
  sendBillViaWhatsApp,
  formatPhoneNumber,
} from '@/lib/whatsapp-utils';
```

### **Basic Usage**
```typescript
// Complete workflow
const whatsappUrl = sendBillViaWhatsApp('919876543210', {
  customerName: 'John Doe',
  restaurantName: 'DineFlow Restaurant',
  billId: 'INV-202606-1234',
  billAmount: 1250,
  visitDate: '2026-06-05',
  tableNumber: 12,
});

// Open WhatsApp
window.open(whatsappUrl, '_blank');
```

---

## 📚 API Reference

### **1. generateBillUrl()**

Generate a customer-facing bill URL.

**Signature:**
```typescript
function generateBillUrl(billId: string): string
```

**Parameters:**
- `billId` (string): The invoice number from the database

**Returns:**
- Full URL to the digital bill page

**Example:**
```typescript
const url = generateBillUrl('INV-202606-1234');
// Returns: 'https://dineinflowd.vercel.app/bill/INV-202606-1234'
```

**Environment Variable:**
```env
VITE_PUBLIC_APP_URL=https://dineinflowd.vercel.app
```

---

### **2. generateWhatsAppMessage()**

Generate a professional WhatsApp message with bill details.

**Signature:**
```typescript
function generateWhatsAppMessage(details: BillDetails): string

interface BillDetails {
  customerName: string;
  restaurantName: string;
  billId: string;
  billAmount: number;
  visitDate: string; // ISO date or formatted date
  tableNumber?: string | number; // Optional
}
```

**Parameters:**
- `details.customerName`: Customer's full name
- `details.restaurantName`: Restaurant brand name
- `details.billId`: Invoice number (from database)
- `details.billAmount`: Total bill amount (number, not string)
- `details.visitDate`: Visit date (ISO string or formatted)
- `details.tableNumber`: Table number (optional)

**Returns:**
- Formatted multi-line WhatsApp message string

**Example:**
```typescript
const message = generateWhatsAppMessage({
  customerName: 'John Doe',
  restaurantName: 'DineFlow Restaurant',
  billId: 'INV-202606-1234',
  billAmount: 1250,
  visitDate: '2026-06-05',
  tableNumber: 12,
});

console.log(message);
```

**Output:**
```
🍽️ Thank You for Dining with DineFlow Restaurant

Dear John Doe,

Thank you for visiting DineFlow Restaurant. We truly appreciate your patronage and hope you had a wonderful dining experience.

Visit Details:
• Date: 05 June 2026
• Table: 12
• Bill Amount: ₹1,250

View Your Bill:
🔗 https://dineinflowd.vercel.app/bill/INV-202606-1234

For your convenience, your digital bill is available online and can be accessed anytime using the link above.

We look forward to welcoming you again soon.

Warm Regards,
DineFlow Restaurant Team
```

---

### **3. generateWhatsAppLink()**

Create a WhatsApp Click-to-Chat URL with pre-filled message.

**Signature:**
```typescript
function generateWhatsAppLink(phoneNumber: string, message: string): string
```

**Parameters:**
- `phoneNumber`: Customer's phone (with country code, no +)
- `message`: Pre-filled message text

**Returns:**
- WhatsApp web URL with encoded message

**Example:**
```typescript
const link = generateWhatsAppLink(
  '919876543210',
  'Hello! Your bill is ready.'
);
// Returns: 'https://wa.me/919876543210?text=Hello%21%20Your%20bill%20is%20ready.'
```

**Phone Number Format:**
- ✅ Correct: `919876543210` (country code + number, no +)
- ❌ Wrong: `+919876543210` (remove the +)
- ❌ Wrong: `9876543210` (missing country code)

**URL Encoding:**
- Automatically encodes special characters
- Spaces → `%20`
- ! → `%21`
- ? → `%3F`

---

### **4. sendBillViaWhatsApp()**

Complete workflow: generate message and WhatsApp link.

**Signature:**
```typescript
function sendBillViaWhatsApp(
  phoneNumber: string,
  billDetails: BillDetails
): string
```

**Parameters:**
- `phoneNumber`: Customer's phone (with country code)
- `billDetails`: Bill information object (same as generateWhatsAppMessage)

**Returns:**
- WhatsApp Click-to-Chat URL ready to open

**Example:**
```typescript
const whatsappUrl = sendBillViaWhatsApp('919876543210', {
  customerName: 'John Doe',
  restaurantName: 'DineFlow Restaurant',
  billId: 'INV-202606-1234',
  billAmount: 1250,
  visitDate: '2026-06-05',
  tableNumber: 12,
});

// Open in new tab
window.open(whatsappUrl, '_blank');

// Or redirect current page
window.location.href = whatsappUrl;
```

---

### **5. formatPhoneNumber()**

Validate and format phone numbers for WhatsApp.

**Signature:**
```typescript
function formatPhoneNumber(
  phoneNumber: string,
  defaultCountryCode?: string
): string
```

**Parameters:**
- `phoneNumber`: Raw phone number input (any format)
- `defaultCountryCode`: Country code to add if missing (default: '91' for India)

**Returns:**
- Cleaned phone number with country code

**Examples:**
```typescript
// Add country code
formatPhoneNumber('9876543210')
// Returns: '919876543210'

// Remove special characters
formatPhoneNumber('+91 98765 43210')
// Returns: '919876543210'

// Already formatted
formatPhoneNumber('919876543210')
// Returns: '919876543210'

// Custom country code
formatPhoneNumber('1234567890', '1')
// Returns: '11234567890'
```

**Accepted Input Formats:**
- `9876543210`
- `+919876543210`
- `+91 98765 43210`
- `091-98765-43210`
- `(+91) 98765-43210`

---

### **6. generateCompactBillMessage()**

Generate short message for SMS or compact sharing.

**Signature:**
```typescript
function generateCompactBillMessage(details: BillDetails): string
```

**Parameters:**
- `details`: Bill information object (same as generateWhatsAppMessage)

**Returns:**
- Compact single-line message

**Example:**
```typescript
const message = generateCompactBillMessage({
  customerName: 'John Doe',
  restaurantName: 'DineFlow Restaurant',
  billId: 'INV-202606-1234',
  billAmount: 1250,
  visitDate: '2026-06-05',
});

console.log(message);
// Output: "Thank you for dining at DineFlow Restaurant! Your bill of ₹1,250 is ready. View: https://dineinflowd.vercel.app/bill/INV-202606-1234"
```

---

## 🎯 Integration Examples

### **Example 1: Billing Drawer Integration**

```typescript
import { sendBillViaWhatsApp, formatPhoneNumber } from '@/lib/whatsapp-utils';

const handleSendWhatsApp = () => {
  const customerPhone = order?.customer_phone || '';
  
  // Validate phone number exists
  if (!customerPhone) {
    toast({
      title: 'Phone Number Required',
      description: 'This order does not have a customer phone number.',
      variant: 'destructive',
    });
    return;
  }
  
  // Format phone number
  const formattedPhone = formatPhoneNumber(customerPhone);
  
  // Generate WhatsApp link
  const whatsappUrl = sendBillViaWhatsApp(formattedPhone, {
    customerName: order.customer_name || 'Valued Customer',
    restaurantName: restaurant.name,
    billId: invoice.invoice_number,
    billAmount: invoice.total_amount,
    visitDate: invoice.created_at,
    tableNumber: order.tables?.table_number,
  });
  
  // Open WhatsApp
  window.open(whatsappUrl, '_blank');
  
  toast({
    title: '✅ WhatsApp Opened',
    description: 'Bill shared successfully with customer.',
  });
};
```

### **Example 2: React Component Button**

```typescript
import { sendBillViaWhatsApp } from '@/lib/whatsapp-utils';

export const WhatsAppButton = ({ order, invoice, restaurant }) => {
  const handleClick = () => {
    if (!order.customer_phone) {
      alert('No phone number for this order');
      return;
    }
    
    const url = sendBillViaWhatsApp(order.customer_phone, {
      customerName: order.customer_name || 'Guest',
      restaurantName: restaurant.name,
      billId: invoice.invoice_number,
      billAmount: invoice.total_amount,
      visitDate: invoice.created_at,
      tableNumber: order.table_number,
    });
    
    window.open(url, '_blank');
  };
  
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg"
    >
      <WhatsAppIcon />
      Send Bill on WhatsApp
    </button>
  );
};
```

### **Example 3: Bulk Send to Multiple Customers**

```typescript
import { sendBillViaWhatsApp } from '@/lib/whatsapp-utils';

const sendBillsToMultipleCustomers = (orders: Order[]) => {
  orders.forEach((order) => {
    if (order.customer_phone && order.invoice) {
      const url = sendBillViaWhatsApp(order.customer_phone, {
        customerName: order.customer_name || 'Valued Customer',
        restaurantName: restaurantName,
        billId: order.invoice.invoice_number,
        billAmount: order.invoice.total_amount,
        visitDate: order.invoice.created_at,
        tableNumber: order.table_number,
      });
      
      // Open each in new tab (browser may block multiple popups)
      window.open(url, '_blank');
      
      // Alternative: Queue links for user to click
      console.log(`WhatsApp link for ${order.customer_name}:`, url);
    }
  });
};
```

---

## 🔒 Security Considerations

### **Phone Number Validation**
```typescript
// Always validate phone numbers before sending
const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Use in production
if (!isValidPhone(customerPhone)) {
  console.error('Invalid phone number');
  return;
}
```

### **Bill URL Security**
- ✅ Bill URLs use `invoice_number` (not database ID)
- ✅ Invoice numbers are unique and non-sequential
- ✅ No sensitive customer data in URL
- ❌ Do not expose internal database IDs

### **Privacy Considerations**
- Only send bills to verified phone numbers
- Require customer consent before WhatsApp sharing
- Include opt-out option in message
- Follow GDPR/data protection regulations

---

## 🌍 Localization

### **Date Formatting**
```typescript
// Default: English format
// "05 June 2026"

// Custom locale
const formatVisitDate = (date: string | Date, locale: string = 'en-US'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Examples
formatVisitDate('2026-06-05', 'en-US'); // "June 05, 2026"
formatVisitDate('2026-06-05', 'en-IN'); // "05 June 2026"
formatVisitDate('2026-06-05', 'hi-IN'); // "05 जून 2026"
```

### **Currency Formatting**
```typescript
// Default: Indian Rupee (₹)
const billAmount = 1250;
const formatted = `₹${billAmount.toLocaleString('en-IN')}`;
// Output: "₹1,250"

// Other currencies
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

formatCurrency(1250, 'INR'); // "₹1,250.00"
formatCurrency(1250, 'USD'); // "$1,250.00"
formatCurrency(1250, 'EUR'); // "€1,250.00"
```

### **Message Localization**
```typescript
// English message template
const englishTemplate = `
🍽️ Thank You for Dining with {restaurantName}

Dear {customerName},

Thank you for visiting {restaurantName}. We truly appreciate your patronage and hope you had a wonderful dining experience.

Visit Details:
• Date: {visitDate}
• Table: {tableNumber}
• Bill Amount: {billAmount}

View Your Bill:
🔗 {billUrl}

We look forward to welcoming you again soon.

Warm Regards,
{restaurantName} Team
`;

// Hindi message template
const hindiTemplate = `
🍽️ {restaurantName} में भोजन के लिए धन्यवाद

प्रिय {customerName},

{restaurantName} में आपका स्वागत करने के लिए धन्यवाद। हम आपके संरक्षण की सराहना करते हैं।

विवरण:
• दिनांक: {visitDate}
• टेबल: {tableNumber}
• बिल राशि: {billAmount}

अपना बिल देखें:
🔗 {billUrl}

हम आपका फिर से स्वागत करने के लिए उत्सुक हैं।

सादर,
{restaurantName} टीम
`;
```

---

## 🧪 Testing

### **Unit Tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateBillUrl,
  generateWhatsAppLink,
  formatPhoneNumber,
} from './whatsapp-utils';

describe('WhatsApp Utilities', () => {
  it('should generate correct bill URL', () => {
    const url = generateBillUrl('INV-123');
    expect(url).toBe('https://dineinflowd.vercel.app/bill/INV-123');
  });
  
  it('should encode WhatsApp message', () => {
    const link = generateWhatsAppLink('919876543210', 'Hello World!');
    expect(link).toContain('text=Hello%20World%21');
  });
  
  it('should format phone number correctly', () => {
    expect(formatPhoneNumber('9876543210')).toBe('919876543210');
    expect(formatPhoneNumber('+919876543210')).toBe('919876543210');
    expect(formatPhoneNumber('091-98765-43210')).toBe('919876543210');
  });
});
```

### **Manual Testing**

```typescript
// Test in browser console
import { sendBillViaWhatsApp } from '@/lib/whatsapp-utils';

// Generate test URL
const testUrl = sendBillViaWhatsApp('919876543210', {
  customerName: 'Test Customer',
  restaurantName: 'Test Restaurant',
  billId: 'TEST-123',
  billAmount: 100,
  visitDate: new Date().toISOString(),
  tableNumber: 1,
});

console.log('Test WhatsApp URL:', testUrl);

// Open in new tab
window.open(testUrl, '_blank');
```

---

## 📊 Analytics Tracking

### **Track WhatsApp Sends**

```typescript
import { sendBillViaWhatsApp } from '@/lib/whatsapp-utils';
import { supabase } from '@/lib/supabase';

const handleSendWhatsApp = async () => {
  const whatsappUrl = sendBillViaWhatsApp(phoneNumber, billDetails);
  
  // Track in database
  await supabase.from('analytics_events').insert({
    event_type: 'whatsapp_bill_sent',
    restaurant_id: restaurantId,
    order_id: orderId,
    invoice_id: invoiceId,
    customer_phone: phoneNumber,
    created_at: new Date().toISOString(),
  });
  
  // Open WhatsApp
  window.open(whatsappUrl, '_blank');
};
```

### **Metrics to Track**
- Number of bills sent via WhatsApp
- Delivery success rate
- Customer engagement (link clicks)
- Time to send after payment
- Peak sending hours

---

## 🚨 Error Handling

### **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| "No phone number" | customer_phone is null | Show toast, ask user to add phone |
| "Invalid phone format" | Phone < 10 digits | Validate before formatting |
| "WhatsApp not opening" | Popup blocked | Ask user to allow popups |
| "Bill URL 404" | Invalid invoice_number | Verify invoice exists in DB |
| "Message too long" | Custom message > 65536 chars | Truncate or use compact message |

### **Error Handling Template**

```typescript
const handleSendWhatsApp = () => {
  try {
    // Validate phone
    if (!order.customer_phone) {
      throw new Error('No customer phone number');
    }
    
    // Validate invoice
    if (!invoice?.invoice_number) {
      throw new Error('Invoice not generated yet');
    }
    
    // Format phone
    const phone = formatPhoneNumber(order.customer_phone);
    if (phone.length < 10) {
      throw new Error('Invalid phone number format');
    }
    
    // Generate link
    const url = sendBillViaWhatsApp(phone, billDetails);
    
    // Open WhatsApp
    const popup = window.open(url, '_blank');
    
    if (!popup) {
      throw new Error('Popup blocked. Please allow popups.');
    }
    
    toast({
      title: '✅ Success',
      description: 'Bill shared on WhatsApp',
    });
    
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    
    toast({
      title: '❌ Error',
      description: error.message || 'Failed to send bill',
      variant: 'destructive',
    });
  }
};
```

---

## 📋 Checklist

### **Implementation Checklist**

- [x] Install utilities: `whatsapp-utils.ts`
- [x] Set environment variable: `VITE_PUBLIC_APP_URL`
- [x] Create bill page: `/bill/:billId` route
- [x] Add WhatsApp button to billing drawer
- [x] Implement phone number validation
- [x] Add error handling
- [x] Test on multiple devices
- [x] Verify message formatting
- [x] Check bill URL accessibility
- [x] Test with international numbers

### **Production Checklist**

- [ ] SSL certificate active (HTTPS required for WhatsApp)
- [ ] Bill URLs publicly accessible
- [ ] Phone numbers validated in database
- [ ] Analytics tracking configured
- [ ] Error logging enabled
- [ ] Popup blocker warnings added
- [ ] Customer consent collected
- [ ] Privacy policy updated

---

## 📞 Support

### **Common Issues**

**Q: WhatsApp opens but message is empty?**  
A: Check URL encoding. Special characters must be encoded.

**Q: Bill link returns 404?**  
A: Verify invoice_number exists in database and matches URL.

**Q: Phone number format error?**  
A: Use `formatPhoneNumber()` to clean and validate.

**Q: Can I send bills via WhatsApp Business API?**  
A: Yes, but requires WhatsApp Business account and API integration.

### **Additional Resources**
- WhatsApp Click-to-Chat Docs: https://faq.whatsapp.com/5913398998672934
- URL Encoding Reference: https://www.w3schools.com/tags/ref_urlencode.asp
- Phone Number Standards: E.164 format

---

**End of WhatsApp Integration Guide**
