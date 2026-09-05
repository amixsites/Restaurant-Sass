# Testing Guide - Restaurant POS SaaS

**Version:** 1.0  
**Date:** June 5, 2026  
**Status:** Ready for Testing

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18.x or higher installed
- Dev server running on `http://localhost:5173`
- Valid Supabase credentials in `.env`

### **Start Development Server**
```bash
cd "d:\SASS applications\Restaurant POS\frontend"
npm install  # If not already installed
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

## ✅ Test Checklist

### **1. Settings Page - GST Configuration**

#### **Access:**
```
http://localhost:5173/admin/settings
```

#### **Test Cases:**

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Page Load** | Navigate to `/admin/settings` | Settings page loads with GST form | ⬜ |
| **Enable GST** | Toggle "Enable GST on Bills" switch ON | GST fields become visible | ⬜ |
| **Disable GST** | Toggle "Enable GST on Bills" switch OFF | GST fields hidden, preview shows 0% | ⬜ |
| **CGST+SGST Mode** | Set CGST=9%, SGST=9% | Preview shows ₹1,180 (18% tax) | ⬜ |
| **IGST Mode** | Toggle "Use IGST" ON, set IGST=18% | Preview shows ₹1,180 (18% tax) | ⬜ |
| **Custom Rates** | Set CGST=2.5%, SGST=2.5% (5% total) | Preview shows ₹1,050 (5% tax) | ⬜ |
| **GSTIN Entry** | Enter `27AAPCS1234M1Z5` | GSTIN field accepts uppercase input | ⬜ |
| **Save Settings** | Click "Save Settings" button | Success toast, button shows "Saved!" | ⬜ |
| **Reset Defaults** | Click "Reset to defaults" | GST resets to CGST 9% + SGST 9% | ⬜ |
| **Live Preview** | Change any rate | Preview updates instantly | ⬜ |
| **Billing Preferences** | Check bottom card | Shows current active GST config | ⬜ |

#### **Screenshots to Capture:**
- [ ] Settings page on desktop
- [ ] Settings page on mobile
- [ ] Live preview calculation
- [ ] Success state after save

---

### **2. Billing Drawer - Enhanced UI & GST**

#### **Access:**
```
http://localhost:5173/admin/billing
```

#### **Test Cases:**

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Page Load** | Navigate to `/admin/billing` | Billing page with active tables | ⬜ |
| **Open Drawer** | Click "Generate Bill" on table | Drawer opens with invoice preview | ⬜ |
| **Items Visibility** | Scroll items section | All order items visible in table | ⬜ |
| **GST Calculation** | Check GST breakdown | Matches settings (CGST+SGST or IGST) | ⬜ |
| **No GST Mode** | Disable GST in settings, reopen | GST section shows "Not applicable" | ⬜ |
| **Discount Slider** | Drag slider 0-100% | Discount amount updates live | ⬜ |
| **Discount Input** | Type "25" in input field | 25% discount applied | ⬜ |
| **Payment Method** | Click each mode (Cash/Card/UPI/Split) | Selected mode highlights in blue | ⬜ |
| **Complete Payment** | Click "Complete Payment" button | Success animation, WhatsApp button appears | ⬜ |
| **Print Invoice** | Click "Print Guest Bill" | Browser print dialog opens | ⬜ |
| **WhatsApp Send** | Click "Send Bill on WhatsApp" | WhatsApp web opens with message | ⬜ |
| **Refund** | Click "Void Invoice" on paid bill | Confirmation, order cancelled | ⬜ |
| **Mobile Layout** | Test on mobile viewport (< 768px) | Card-based responsive layout | ⬜ |
| **Desktop Layout** | Test on desktop viewport (> 1024px) | Two-panel layout: preview + controls | ⬜ |

#### **Sample Test Data:**
```typescript
// Order with multiple items
Order ID: [any active order]
Table: T-5
Items: 3-5 menu items
Customer Phone: 9876543210
Amount: ₹500-2000
```

#### **Screenshots to Capture:**
- [ ] Billing drawer desktop view
- [ ] Billing drawer mobile view
- [ ] Items table scrollable
- [ ] GST breakdown section
- [ ] Payment success state
- [ ] WhatsApp message preview

---

### **3. Analytics Page - Real-Time Data**

#### **Access:**
```
http://localhost:5173/admin/analytics
```

#### **Test Cases:**

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Page Load** | Navigate to `/admin/analytics` | Analytics dashboard loads | ⬜ |
| **Revenue Card** | Check "Today's Revenue" | Shows ₹ amount + trend % | ⬜ |
| **Active Orders** | Check "Active Orders" | Count matches orders table | ⬜ |
| **Table Occupancy** | Check "Table Occupancy" | Percentage = occupied/total × 100 | ⬜ |
| **Charts Load** | Check sales chart | Line/bar chart renders with data | ⬜ |
| **Top Selling Items** | Check top sellers list | Shows items with quantity sold | ⬜ |
| **Recent Activity** | Check activity feed | Lists recent orders/invoices | ⬜ |
| **Daily Range** | Select "Daily" | Shows hourly data (9am-8pm) | ⬜ |
| **Weekly Range** | Select "Weekly" | Shows 7 days data | ⬜ |
| **Monthly Range** | Select "Monthly" | Shows 4 weeks data | ⬜ |
| **Yearly Range** | Select "Yearly" | Shows 12 months data | ⬜ |
| **Realtime Update** | Complete a payment | Analytics updates within 15s | ⬜ |
| **Empty State** | Test with new restaurant (no data) | Shows zero values, no errors | ⬜ |

#### **Verification Steps:**
1. Note down current revenue
2. Complete a payment in billing
3. Wait 15 seconds
4. Check if revenue updated

#### **Screenshots to Capture:**
- [ ] Analytics dashboard full view
- [ ] Revenue trend chart
- [ ] Top selling items
- [ ] Recent activity feed

---

### **4. Digital Bill Page - Public Access**

#### **Access:**
```
http://localhost:5173/bill/{INVOICE_NUMBER}
```

**How to Get Invoice Number:**
1. Go to `/admin/billing`
2. Complete a payment
3. Copy invoice number (e.g., `INV-202606-1234`)
4. Navigate to `/bill/INV-202606-1234`

#### **Test Cases:**

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Valid Bill** | Open `/bill/INV-202606-1234` | Bill page loads with full details | ⬜ |
| **Invalid Bill** | Open `/bill/INVALID-123` | "Bill Not Found" error page | ⬜ |
| **Restaurant Info** | Check header section | Logo, name, address, phone, GSTIN | ⬜ |
| **Bill Details** | Check info card | Bill #, date, table, guests, phone | ⬜ |
| **Order Items** | Check items table | All items with qty, price, total | ⬜ |
| **GST Breakdown** | Check summary section | CGST+SGST or IGST shown correctly | ⬜ |
| **Grand Total** | Check total amount | Matches invoice total_amount | ⬜ |
| **Payment Status** | Check status badge | Green=Paid, Orange=Pending, Red=Refunded | ⬜ |
| **Share Button** | Click "Share" | Native share dialog or copy link | ⬜ |
| **Download PDF** | Click "Download PDF" | Browser print-to-PDF opens | ⬜ |
| **Print Button** | Click "Print" | Print dialog opens | ⬜ |
| **Mobile Layout** | Test on mobile (< 640px) | Stacked layout, readable | ⬜ |
| **Tablet Layout** | Test on tablet (640-1024px) | Two-column grid layout | ⬜ |
| **Desktop Layout** | Test on desktop (> 1024px) | Centered max-width container | ⬜ |
| **Dark Mode** | Toggle system dark mode | Colors adapt, readable | ⬜ |

#### **Test Data:**
Create test bills with:
- ✅ Paid invoice
- ⏳ Pending invoice (if possible)
- 🔴 Refunded invoice

#### **Screenshots to Capture:**
- [ ] Bill page desktop view
- [ ] Bill page mobile view
- [ ] Print preview
- [ ] Empty state ("Bill Not Found")

---

### **5. WhatsApp Integration - End-to-End**

#### **Prerequisites:**
- Order must have `customer_phone` field
- Phone format: `9876543210` or `+919876543210`

#### **Test Cases:**

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **With Phone Number** | Complete payment for order with phone | WhatsApp button enabled | ⬜ |
| **Without Phone Number** | Complete payment for walk-in order | Toast: "No phone number registered" | ⬜ |
| **Click WhatsApp Button** | Click "Send Bill on WhatsApp" | WhatsApp web opens in new tab | ⬜ |
| **Message Format** | Check WhatsApp message | Professional greeting, details, link | ⬜ |
| **Bill Link** | Click link in WhatsApp | Digital bill page opens | ⬜ |
| **Phone Formatting** | Test with `9876543210` | Converts to `919876543210` | ⬜ |
| **International Format** | Test with `+919876543210` | Removes + and works | ⬜ |
| **Invalid Phone** | Test with `123` | Error or no action | ⬜ |

#### **WhatsApp Message Template:**
```
Hi, here is your bill for Table T-5 from DineFlow Restaurant. 
Total Amount: ₹1,250.00.
```

#### **Expected WhatsApp URL:**
```
https://wa.me/919876543210?text=Hi%2C%20here%20is%20your%20bill%20for%20Table%20T-5...
```

#### **Screenshots to Capture:**
- [ ] WhatsApp button in billing drawer
- [ ] WhatsApp web with message
- [ ] Bill link clicked from WhatsApp

---

## 🔍 Cross-Browser Testing

### **Browsers to Test:**

| Browser | Version | Desktop | Mobile | Status |
|---------|---------|---------|--------|--------|
| Chrome | Latest | ⬜ | ⬜ | |
| Firefox | Latest | ⬜ | ⬜ | |
| Safari | Latest | ⬜ | ⬜ | |
| Edge | Latest | ⬜ | ⬜ | |
| Opera | Latest | ⬜ | | |

### **Key Features to Test:**
- [ ] Settings page renders correctly
- [ ] Billing drawer animations smooth
- [ ] Analytics charts display
- [ ] Digital bill page responsive
- [ ] WhatsApp link opens correctly
- [ ] Print dialogs work

---

## 📱 Responsive Testing

### **Viewport Sizes:**

| Device | Width | Height | Orientation | Status |
|--------|-------|--------|-------------|--------|
| iPhone SE | 375px | 667px | Portrait | ⬜ |
| iPhone 12 Pro | 390px | 844px | Portrait | ⬜ |
| iPad Mini | 768px | 1024px | Portrait | ⬜ |
| iPad Pro | 1024px | 1366px | Landscape | ⬜ |
| Desktop | 1920px | 1080px | Landscape | ⬜ |

### **Key Elements to Check:**
- [ ] Navigation sidebar collapses on mobile
- [ ] Billing drawer fills screen on mobile
- [ ] Settings form stacks vertically
- [ ] Analytics cards responsive grid
- [ ] Bill page readable on all sizes

---

## 🐛 Known Issues to Watch For

### **1. Port 5173 Already in Use**
**Error:** `Port 5173 is already in use`

**Solution:**
```bash
# Kill the existing process
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- --port 5174
```

**Note:** If using different port, update Supabase CORS settings.

### **2. Supabase CORS Error**
**Error:** `Access-Control-Allow-Origin header has a value 'http://localhost:5173' that is not equal to the supplied origin`

**Solution:**
- Ensure dev server runs on port 5173
- Check Supabase dashboard → Project Settings → API → CORS

### **3. Missing Environment Variables**
**Error:** `Missing Supabase environment variables`

**Solution:**
```bash
# Check .env file exists
ls frontend/.env

# Verify variables
cat frontend/.env | grep VITE_SUPABASE
```

### **4. WhatsApp Not Opening**
**Issue:** WhatsApp button doesn't open

**Debugging:**
1. Check console for errors
2. Verify `customer_phone` in order
3. Test phone number format
4. Try manually: `https://wa.me/919876543210?text=Test`

---

## ✅ Acceptance Criteria

### **All Tests Must Pass:**

**Settings Page:**
- ✅ GST configuration saves and persists
- ✅ Live preview updates instantly
- ✅ CGST+SGST and IGST modes work
- ✅ GSTIN input validation

**Billing Drawer:**
- ✅ All items visible with scroll
- ✅ GST calculated from settings
- ✅ Discount slider functional
- ✅ Payment methods selectable
- ✅ Success state after payment
- ✅ Print and WhatsApp buttons work

**Analytics:**
- ✅ Revenue displays correctly
- ✅ Charts render with data
- ✅ Realtime updates work
- ✅ All time ranges functional

**Digital Bill:**
- ✅ Bill page loads from URL
- ✅ All details display correctly
- ✅ Responsive on all devices
- ✅ Print/download/share work
- ✅ Error handling for invalid bills

**WhatsApp:**
- ✅ Message format professional
- ✅ Bill link works
- ✅ Phone number formatting correct

---

## 📊 Test Results Template

### **Test Session Details:**
- **Date:** _______________
- **Tester:** _______________
- **Browser:** _______________
- **OS:** _______________

### **Summary:**
- **Total Tests:** _______________
- **Passed:** _______________
- **Failed:** _______________
- **Blocked:** _______________
- **Pass Rate:** _______________

### **Issues Found:**

| Issue # | Feature | Severity | Description | Status |
|---------|---------|----------|-------------|--------|
| 1 | | High/Med/Low | | Open/Fixed |
| 2 | | High/Med/Low | | Open/Fixed |
| 3 | | High/Med/Low | | Open/Fixed |

### **Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🎯 Sign-Off

### **Developer Sign-Off:**
- **Name:** Kiro AI
- **Date:** June 5, 2026
- **Status:** ✅ Ready for Testing

### **QA Sign-Off:**
- **Name:** _______________
- **Date:** _______________
- **Status:** ⬜ Approved / ⬜ Rejected

### **Product Owner Sign-Off:**
- **Name:** _______________
- **Date:** _______________
- **Status:** ⬜ Approved / ⬜ Rejected

---

**End of Testing Guide**
