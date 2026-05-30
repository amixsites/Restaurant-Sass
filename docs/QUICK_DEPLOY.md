# ⚡ Quick Deploy Reference

## 🚀 Deploy to Vercel (5 minutes)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Set environment variables
vercel env add VITE_SUPABASE_URL
# Paste your Supabase project URL

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase anon key

# 4. Deploy to production
vercel --prod
```

---

## 🗄️ Set Up Supabase (10 minutes)

### Run SQL Files (in order)
Go to Supabase Dashboard → SQL Editor and run:

1. `supabase/schema.sql` — Core tables, enums, RLS
2. `supabase/migrations/phase2_schema.sql` — Additional columns
3. `supabase/migrations/phase3_indexes.sql` — Performance indexes
4. `supabase/migrations/phase4_customer_rls.sql` — Customer RLS policies

### Enable Realtime
Supabase Dashboard → Database → Replication → Enable for:
- `orders`
- `order_items`
- `tables`

Or run in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
```

### Create Storage Bucket
Supabase Dashboard → Storage → New Bucket:
- Name: `menu-images`
- Public: ✅ Yes

### Deploy Edge Function
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy manage-users
```

---

## 👤 Create First Super Admin

1. Supabase Dashboard → Authentication → Users → Add User
2. Enter email + password
3. Copy the user UUID
4. SQL Editor:

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'paste-uuid-here',
  'admin@yourdomain.com',
  'Super Admin',
  'SUPER_ADMIN'
);
```

---

## 🧪 Test Checklist

- [ ] Log in as SUPER_ADMIN
- [ ] Create restaurant
- [ ] Add menu items
- [ ] Add tables
- [ ] Create staff (waiter, kitchen, cashier)
- [ ] Take order as waiter
- [ ] Update status as kitchen
- [ ] Generate bill as cashier
- [ ] Scan QR as customer → place order
- [ ] Verify realtime updates

---

## 🔑 Get Supabase Credentials

Supabase Dashboard → Project Settings → API:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## 📱 Generate QR Codes

Customer menu URL format:
```
https://your-domain.com/m/{restaurantId}/{tableId}
```

Use any QR generator (qr-code-generator.com, qrcode-monkey.com) to create codes for each table.

---

## 🆘 Troubleshooting

### Build fails with "Missing Supabase environment variables"
→ Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel environment variables

### "No profile record found for this login"
→ User exists in `auth.users` but not in `public.users`. Run the INSERT query above.

### Realtime not working
→ Check Supabase Dashboard → Database → Replication → Verify tables are enabled

### Customer can't place orders
→ Run `supabase/migrations/phase4_customer_rls.sql` to add public RLS policies

### Images not uploading
→ Create `menu-images` storage bucket and set to public

---

## 📚 Full Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Complete deployment guide
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — Database setup
- [OPTIMIZATION_REPORT.md](OPTIMIZATION_REPORT.md) — Optimization report
