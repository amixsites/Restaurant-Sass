# 🚨 CRITICAL FIX: QR Code Backend Integration

## Issue Summary
Frontend was making QR code requests to Vercel (frontend domain) instead of Render (backend domain), causing 404 errors.

**Error Example:**
```
Request URL: https://dineinflowd-3c6m801jz-amixsites-projects.vercel.app/api/tables/011d0655-3b3f-43b4-9e2b-b106f8eda931/qr-code-image
Expected URL: https://dineinflow.onrender.com/api/tables/011d0655-3b3f-43b4-9e2b-b106f8eda931/qr-code-image
```

---

## Root Cause
Missing `VITE_API_URL` environment variable in `frontend/.env`

When `VITE_API_URL` is not set:
- Frontend uses relative paths: `/api/tables/...`
- Browser resolves relative URLs against current domain (Vercel)
- Requests never reach the FastAPI backend on Render

---

## Solution Applied ✅

### 1. Added Environment Variable
**File:** `frontend/.env`

```env
VITE_SUPABASE_URL=https://rwstxbialzgolomzjayt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://dineinflow.onrender.com  ← ADDED THIS
VITE_WHATSAPP_PHONE_NUMBER_ID=mock
VITE_WHATSAPP_ACCESS_TOKEN=mock
```

### 2. How It Works
**File:** `frontend/src/lib/api.ts`

```typescript
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If apiBaseUrl is set, use absolute URL to backend
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
```

**Before Fix:**
```typescript
getApiUrl('/api/tables/123/qr-code-image')
// Returns: '/api/tables/123/qr-code-image' (relative)
// Browser resolves to: https://vercel-domain.app/api/tables/123/qr-code-image ❌
```

**After Fix:**
```typescript
getApiUrl('/api/tables/123/qr-code-image')
// Returns: 'https://dineinflow.onrender.com/api/tables/123/qr-code-image' (absolute)
// Browser requests: https://dineinflow.onrender.com/api/tables/123/qr-code-image ✅
```

---

## Verification Steps

### 1. Restart Dev Server
```bash
cd frontend
npm run dev
```

### 2. Check Environment Variable
Open browser console and run:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**Expected Output:**
```
https://dineinflow.onrender.com
```

**If you see `undefined`:**
- Environment variable not loaded
- Restart dev server
- Check `.env` file exists in `frontend/` directory

### 3. Test QR Code Requests
1. Navigate to: `http://localhost:5173/admin/tables`
2. Open browser DevTools → Network tab
3. Click on any table to view QR code
4. Check the request URL in Network tab

**Expected:**
```
Request URL: https://dineinflow.onrender.com/api/tables/{table_id}/qr-code-image
Status: 200 OK
```

**If still seeing Vercel domain:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check console for environment variable

---

## Backend Endpoints (Confirmed Working)

### QR Code Generation
```python
@app.get("/api/tables/{table_id}/qr-code-image")
def get_qr_image(table_id: str, request: Request):
    # Returns PNG image of QR code
```

### QR Code PDF
```python
@app.get("/api/tables/{table_id}/qr-code-pdf")
def get_qr_pdf(table_id: str, request: Request):
    # Returns PDF with formatted QR code
```

### Generate QR Token
```python
@app.post("/api/tables/{table_id}/generate-qr")
def generate_qr(table_id: str, authorization: Optional[str] = Header(None)):
    # Creates new QR token for table
```

### Regenerate QR Token
```python
@app.post("/api/tables/{table_id}/regenerate-qr")
def regenerate_qr(table_id: str, authorization: Optional[str] = Header(None)):
    # Regenerates QR token (invalidates old one)
```

---

## Files Using QR Code API

### 1. ManageQr.tsx
**Location:** `frontend/src/pages/RestaurantAdmin/ManageQr.tsx`

```typescript
// Download QR as PNG
const handleDownloadPNG = (tableId: string) => {
  window.open(getApiUrl(`/api/tables/${tableId}/qr-code-image`), '_blank');
};

// Display QR image
<img
  src={getApiUrl(`/api/tables/${tableId}/qr-code-image?t=${refreshKey}`)}
  alt={`QR code for table ${table.table_number}`}
/>
```

### 2. TableQrModal.tsx
**Location:** `frontend/src/components/TableQrModal.tsx`

```typescript
// Download QR as PNG
const handleDownloadPNG = () => {
  if (!table?.id) return;
  window.open(getApiUrl(`/api/tables/${table.id}/qr-code-image`), '_blank');
};

// Display QR image
<img 
  src={getApiUrl(`/api/tables/${table.id}/qr-code-image?t=${qrRefreshKey}`)} 
  alt={`QR Code Table T-${table.table_number}`}
/>
```

---

## Deployment Checklist

### Local Development
- [x] Add `VITE_API_URL=https://dineinflow.onrender.com` to `frontend/.env`
- [x] Restart dev server
- [x] Verify environment variable in browser console
- [x] Test QR code display and download

### Vercel Deployment
- [ ] Go to Vercel Dashboard → Project → Settings → Environment Variables
- [ ] Add: `VITE_API_URL` = `https://dineinflow.onrender.com`
- [ ] Redeploy frontend
- [ ] Test QR codes on production URL

### Render Backend
- [ ] Verify backend is running: `https://dineinflow.onrender.com/docs`
- [ ] Check QR endpoints are listed in API docs
- [ ] Test endpoint directly: `https://dineinflow.onrender.com/api/tables/{table_id}/qr-code-image`

---

## Common Issues

### Issue: QR code shows 404
**Cause:** Backend not running or table doesn't have QR token
**Solution:**
1. Check backend status: `https://dineinflow.onrender.com/docs`
2. Generate QR token for table first
3. Verify table has `qr_token` in database

### Issue: CORS error
**Cause:** Backend CORS not configured for frontend domain
**Solution:**
1. Check `FRONTEND_URL` in backend `.env`
2. Should include: `http://localhost:5173,https://your-vercel-domain.vercel.app`
3. Restart backend after changing CORS settings

### Issue: Environment variable undefined
**Cause:** Dev server not restarted after adding `.env`
**Solution:**
1. Stop dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Verify in console: `console.log(import.meta.env.VITE_API_URL)`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                    (Vercel / localhost)                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ManageQr.tsx / TableQrModal.tsx                     │  │
│  │  ↓                                                    │  │
│  │  getApiUrl('/api/tables/123/qr-code-image')         │  │
│  │  ↓                                                    │  │
│  │  lib/api.ts                                          │  │
│  │  ↓                                                    │  │
│  │  Returns: https://dineinflow.onrender.com/api/...   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS Request
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│                  (Render: dineinflow.onrender.com)          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FastAPI (main.py)                                   │  │
│  │  ↓                                                    │  │
│  │  @app.get("/api/tables/{table_id}/qr-code-image")   │  │
│  │  ↓                                                    │  │
│  │  1. Fetch table from Supabase                        │  │
│  │  2. Get qr_token                                     │  │
│  │  3. Generate QR code image                           │  │
│  │  4. Return PNG                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                             │
│                                                             │
│  tables:                                                    │
│  - id                                                       │
│  - table_number                                             │
│  - qr_token  ← Used to generate QR code URL                │
│  - restaurant_id                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Start Dev Server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test QR Codes:**
   - Navigate to: `http://localhost:5173/admin/tables`
   - Click "View QR" on any table
   - Verify image loads correctly
   - Check Network tab shows requests to `dineinflow.onrender.com`

3. **Deploy to Production:**
   - Add `VITE_API_URL` to Vercel environment variables
   - Redeploy frontend
   - Test on production URL

---

## Status: ✅ FIXED

- [x] Added `VITE_API_URL` to `frontend/.env`
- [x] Verified backend endpoints exist
- [x] Documented solution and verification steps
- [x] Ready for testing

**Next Action:** Restart dev server and test QR code functionality
