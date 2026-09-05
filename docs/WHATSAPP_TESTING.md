# WhatsApp Integration Testing Guide

**Date:** June 5, 2026  
**Status:** ✅ Ready for Testing

---

## 🔍 Issue Resolution

### **Problems Fixed:**

1. ❌ **Hardcoded Bill URL** - Fixed to use environment variable
2. ❌ **Duplicate Files** - Synced both GenerateBillDrawer files
3. ❌ **Missing WhatsApp Utils Import** - Added proper imports
4. ❌ **No Bill Link in Message** - Now generates full professional message with link

### **Files Updated:**

```
frontend/src/
├── lib/
│   ├── whatsapp-utils.ts                ✅ Fixed BASE_URL
│   └── test-whatsapp.ts                 ✅ New test utilities
├── components/
│   └── GenerateBillDrawer.tsx           ✅ Updated with utils
└── features/
    └── billing/
        └── components/
            └── GenerateBillDrawer.tsx   ✅ Synced with main file
```

---

## 🧪 Testing Methods

### **Method 1: Automated Test (Recommended)**

```bash
# 1. Start dev server
cd frontend
npm run dev

# 2. Open browser console
http://localhost:5173

# 3. Run test function in console
testWhatsAppIntegration()
```

**Expected Output:**
```
🧪 Testing WhatsApp Integration...

✅ Test 1: Generate Bill URL
   Result: http://localhost:5173/bill/INV-202606-1234

✅ Test 2: Format Phone Number
   Input: 9876543210
   Output: 919876543210

✅ Test 3: Generate WhatsApp Message
   Message Preview:
   🍽️ Thank You for Dining with DineFlow Restaurant
   
   Dear John Doe,
   
   Thank you for visiting DineFlow Restaurant...
   
   View Your Bill:
   🔗 http://localhost:5173/bill/INV-202606-1234
   ...

✅ Test 4: Generate WhatsApp Link
   Link: https://wa.me/919876543210?text=...

✅ Test 5: Complete Flow - sendBillViaWhatsApp
   Link: https://wa.me/919876543210?text=...

✅ Test 6: Generate Compact Message
   Message: Thank you for dining at DineFlow Restaurant! Your bill of ₹1,250 is ready...

✅ Test 7: Test Various Phone Formats
   9876543210               → 919876543210
   +919876543210            → 919876543210
   +91 98765 43210          → 919876543210
   091-98765-43210          → 919876543210
   (+91) 98765-43210        → 919876543210

✅ Test 8: Error Handling
   ✓ Correctly throws error for invalid phone
   ✓ Correctly throws error for empty phone
   ✓ Correctly throws error for empty bill ID

🎉 All Tests Passed!
```

---

### **Method 2: Manual UI Testing**

#### **Step-by-Step:**

1. **Start Dev Server:**
```bash
cd "d:\SASS applications\Restaurant POS\frontend"
npm run dev
```

2. **Login:**
```
http://localhost:5173/login
```

3. **Navigate to Billing:**
```
http://localhost:5173/admin/billing
```

4. **Create Test Order:**
   - Select a table with active order
   - Or create a new order with customer phone: `9876543210`

5. **Complete Payment:**
   - Click "Generate Bill" button
   - Add discount if needed
   - Select payment method
   - Click "Complete Payment"

6. **Send WhatsApp:**
   - Click "Send Bill on WhatsApp" button
   - WhatsApp should open in new tab

7. **Verify Message:**
   - Check message has customer name
   - Check message has restaurant name
   - Check message has bill amount
   - **Check message has bill link** (should be visible)
   - Check link format: `http://localhost:5173/bill/INV-XXXXXX`

8. **Test Bill Link:**
   - Click the bill link in WhatsApp message
   - Should open digital bill page
   - Verify all details match

---

### **Method 3: Direct URL Testing**

#### **Test Bill URL Generation:**

```javascript
// In browser console
import { generateBillUrl } from '@/lib/whatsapp-utils';

// Test with sample invoice number
const url = generateBillUrl('INV-202606-1234');
console.log(url);
// Expected: http://localhost:5173/bill/INV-202606-1234
```

#### **Test Complete Flow:**

```javascript
// In browser console
import { sendBillViaWhatsApp } from '@/lib/whatsapp-utils';

const link = sendBillViaWhatsApp('9876543210', {
  customerName: 'Test Customer',
  restaurantName: 'Test Restaurant',
  billId: 'INV-TEST-001',
  billAmount: 500,
  visitDate: new Date().toISOString(),
  tableNumber: 5,
});

console.log('WhatsApp Link:', link);
// Copy and paste into browser to test
window.open(link, '_blank');
```

---

## ✅ Test Checklist

### **Basic Functionality:**

- [ ] WhatsApp opens when button clicked
- [ ] Message includes customer name
- [ ] Message includes restaurant name
- [ ] Message includes bill amount
- [ ] Message includes table number
- [ ] Message includes visit date
- [ ] **Message includes bill link**
- [ ] Bill link is clickable
- [ ] Bill link opens correct page

### **Bill URL Format:**

- [ ] Development: `http://localhost:5173/bill/{invoice_number}`
- [ ] Production: `https://dineinflowd.vercel.app/bill/{invoice_number}`

### **Phone Number Formatting:**

- [ ] `9876543210` → `919876543210`
- [ ] `+919876543210` → `919876543210`
- [ ] `+91 98765 43210` → `919876543210`
- [ ] `091-98765-43210` → `919876543210`

### **Error Handling:**

- [ ] No phone number → Shows error toast
- [ ] Invalid phone → Shows error toast
- [ ] Error includes helpful message

### **Message Quality:**

- [ ] Professional greeting
- [ ] Polite tone
- [ ] Clear structure
- [ ] Proper formatting
- [ ] Emojis tasteful (not excessive)

---

## 🐛 Troubleshooting

### **Issue: Bill Link Not Showing**

**Check:**
1. Verify `VITE_PUBLIC_APP_URL` in `.env`
2. Restart dev server after `.env` changes
3. Check browser console for errors
4. Run automated test: `testWhatsAppIntegration()`

**Solution:**
```bash
# Verify .env file
cat frontend/.env | grep VITE_PUBLIC_APP_URL

# Should show:
# VITE_PUBLIC_APP_URL=http://localhost:5173 (dev)
# VITE_PUBLIC_APP_URL=https://dineinflowd.vercel.app (prod)

# Restart server
npm run dev
```

---

### **Issue: Old Message Still Showing**

**Check:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check correct file is being imported
4. Verify no cached build files

**Solution:**
```bash
# Clear build cache
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# Reinstall and rebuild
npm install
npm run dev
```

---

### **Issue: WhatsApp Not Opening**

**Check:**
1. Popup blocker enabled
2. Customer phone number exists
3. Phone number valid format
4. Browser console errors

**Solution:**
- Allow popups for localhost
- Check browser console
- Test with valid phone: `9876543210`

---

### **Issue: Bill Page 404**

**Check:**
1. Bill route added to `App.tsx`
2. Invoice number exists in database
3. Route matches invoice_number format

**Solution:**
```typescript
// Verify route in App.tsx
<Route path="/bill/:billId" element={<BillPage />} />

// Test with existing invoice
http://localhost:5173/bill/[actual-invoice-number-from-db]
```

---

## 📱 Sample Test Data

### **Test Order 1: Valid Customer**
```typescript
{
  customer_phone: '9876543210',
  customer_name: 'John Doe',
  table_number: 12,
  total_amount: 1250,
  invoice_number: 'INV-202606-1234'
}
```

**Expected WhatsApp URL:**
```
https://wa.me/919876543210?text=%F0%9F%8D%BD%EF%B8%8F%20*Thank%20You%20for%20Dining%20with%20DineFlow%20Restaurant*...
```

**Expected Message:**
```
🍽️ Thank You for Dining with DineFlow Restaurant

Dear John Doe,

Thank you for visiting DineFlow Restaurant. We truly appreciate your patronage and hope you had a wonderful dining experience.

Visit Details:
• Date: 05 June 2026
• Table: 12
• Bill Amount: ₹1,250

View Your Bill:
🔗 http://localhost:5173/bill/INV-202606-1234

For your convenience, your digital bill is available online and can be accessed anytime using the link above.

We look forward to welcoming you again soon.

Warm Regards,
DineFlow Restaurant Team
```

---

### **Test Order 2: Without Customer Name**
```typescript
{
  customer_phone: '9876543210',
  customer_name: null,
  table_number: 5,
  total_amount: 850,
  invoice_number: 'INV-202606-5678'
}
```

**Expected Message:**
```
🍽️ Thank You for Dining with DineFlow Restaurant

Dear Customer 3210,

Thank you for visiting DineFlow Restaurant...
```

---

### **Test Order 3: Walk-in (No Phone)**
```typescript
{
  customer_phone: null,
  customer_name: null,
  table_number: 3,
  total_amount: 450,
  invoice_number: 'INV-202606-9012'
}
```

**Expected Behavior:**
- Shows error toast: "Phone Number Required"
- Does not open WhatsApp

---

## 🔗 Quick Test Links

### **Development:**
```bash
# Bill Page
http://localhost:5173/bill/INV-202606-1234

# Billing Page
http://localhost:5173/admin/billing

# Settings Page
http://localhost:5173/admin/settings
```

### **Production:**
```bash
# Bill Page
https://dineinflowd.vercel.app/bill/INV-202606-1234

# Billing Page
https://dineinflowd.vercel.app/admin/billing

# Settings Page
https://dineinflowd.vercel.app/admin/settings
```

---

## 📊 Test Results Template

### **Test Session:**
- **Date:** _____________
- **Tester:** _____________
- **Environment:** Dev / Prod
- **Browser:** _____________

### **Results:**

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Bill URL generates | `http://localhost:5173/bill/INV-XXX` | | ⬜ |
| Phone formats correctly | `919876543210` | | ⬜ |
| Message includes name | Customer name in greeting | | ⬜ |
| Message includes link | Bill URL visible and clickable | | ⬜ |
| WhatsApp opens | New tab with message | | ⬜ |
| Bill page loads | Full invoice displayed | | ⬜ |
| Error handling | Proper error messages | | ⬜ |

### **Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### **Sign-Off:**
- [ ] All tests passed
- [ ] Ready for production

---

## 🎯 Success Criteria

### **✅ Integration is working when:**

1. **WhatsApp Button:**
   - ✓ Visible after payment completion
   - ✓ Clickable
   - ✓ Opens WhatsApp in new tab

2. **WhatsApp Message:**
   - ✓ Professional greeting with restaurant name
   - ✓ Customer name (or fallback)
   - ✓ Visit date formatted nicely
   - ✓ Table number included
   - ✓ Bill amount formatted with ₹ symbol
   - ✓ **Bill link visible and clickable**
   - ✓ Professional closing

3. **Bill Link:**
   - ✓ Correct format: `{BASE_URL}/bill/{invoice_number}`
   - ✓ Opens in new tab
   - ✓ Displays full invoice
   - ✓ Matches WhatsApp message details

4. **Error Handling:**
   - ✓ Missing phone shows friendly error
   - ✓ Invalid phone shows validation error
   - ✓ Errors don't crash app

---

## 🚀 Deployment Verification

### **Before Deploying:**

```bash
# 1. Run all tests
npm run test

# 2. Build production
npm run build

# 3. Preview build
npm run preview

# 4. Test in preview mode
http://localhost:4173

# 5. Verify environment variables
echo $VITE_PUBLIC_APP_URL
```

### **After Deploying:**

1. Test production URL in WhatsApp message
2. Verify bill links open correctly
3. Test on mobile device
4. Verify no console errors

---

**Status:** ✅ Ready for comprehensive testing!

Run `testWhatsAppIntegration()` in browser console to start automated tests.
