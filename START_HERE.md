# 🚀 Quick Start Guide

## Start Development Server

```bash
cd frontend
npm run dev
```

Server will start at: **http://localhost:5173**

---

## ✅ Pre-Flight Checklist

Before starting, verify:

1. **Environment Variables** (`frontend/.env`):
   ```env
   VITE_SUPABASE_URL=https://rwstxbialzgolomzjayt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_API_URL=https://dineinflow.onrender.com
   ```

2. **Dependencies Installed**:
   ```bash
   cd frontend
   npm install
   ```

3. **Port 5173 Available**:
   - If port is taken, kill the process or change port in `vite.config.ts`

---

## 🧪 Test Application

### 1. Login
- Navigate to: `http://localhost:5173/login`
- Use your Supabase credentials

### 2. Test Routes
- **Dashboard:** `http://localhost:5173/admin/dashboard`
- **Orders:** `http://localhost:5173/admin/orders`
- **Kitchen:** `http://localhost:5173/admin/kitchen`
- **Billing:** `http://localhost:5173/admin/billing`
- **Tables:** `http://localhost:5173/admin/tables`
- **Menu:** `http://localhost:5173/admin/menu`
- **Settings:** `http://localhost:5173/admin/settings` ← Configure GST here

### 3. Test QR Codes
1. Go to: `http://localhost:5173/admin/tables`
2. Click "View QR" on any table
3. Open browser DevTools → Network tab
4. Verify requests go to: `https://dineinflow.onrender.com/api/...`

### 4. Test Billing
1. Go to: `http://localhost:5173/admin/billing`
2. Select a table with items
3. Verify:
   - All items visible (with scrolling)
   - GST calculated from settings
   - Payment buttons work
   - Success message shows

### 5. Test Analytics
1. Go to: `http://localhost:5173/admin/dashboard`
2. Verify:
   - Real data from Supabase
   - Metrics update in realtime
   - Charts display correctly

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:**
1. Check `frontend/.env` exists
2. Verify variables are set correctly
3. Restart dev server

### Issue: CORS error
**Solution:**
1. Verify dev server is on port 5173
2. Check Supabase dashboard → Settings → API → CORS
3. Ensure `http://localhost:5173` is whitelisted

### Issue: QR codes show 404
**Solution:**
1. Check `VITE_API_URL` is set in `frontend/.env`
2. Verify backend is running: `https://dineinflow.onrender.com/docs`
3. Restart dev server
4. See `docs/QR_CODE_FIX.md` for detailed guide

### Issue: Port 5173 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change port in vite.config.ts
```

---

## 📚 Documentation

- **Current Status:** `docs/CURRENT_STATUS.md` - All completed tasks
- **QR Code Fix:** `docs/QR_CODE_FIX.md` - QR code integration guide
- **Deployment:** `docs/DEPLOYMENT.md` - Production deployment
- **Architecture:** `docs/ARCHITECTURE.md` - System design
- **Supabase Setup:** `docs/SUPABASE_SETUP.md` - Database setup

---

## 🎯 Recent Fixes

1. ✅ **Billing UI** - Fixed scrolling, added GST from settings
2. ✅ **Settings Route** - Added `/admin/settings` for GST config
3. ✅ **Analytics** - Now uses real Supabase data
4. ✅ **CORS** - Fixed port mismatch (5173)
5. ✅ **Environment** - Added missing variables
6. ✅ **QR Codes** - Fixed backend integration

---

## 🚀 Next Steps

1. Start dev server: `cd frontend && npm run dev`
2. Test all routes and features
3. Configure GST in Settings page
4. Test QR code generation
5. Verify analytics show real data
6. Test mobile responsiveness
7. Deploy to production (Vercel + Render)

---

## 📞 Need Help?

Check browser console for errors and refer to documentation in `docs/` folder.

**Happy coding! 🎉**
