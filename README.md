# 🍽️ Restaurant POS SaaS

Multi-tenant Restaurant Point of Sale system — React + Vite + Supabase.

---

## 📁 Project Structure

```
restaurant-pos/
│
├── frontend/                  ← React + Vite SPA (deploy to Vercel)
│   ├── src/
│   │   ├── components/        ← Reusable UI components + shadcn/ui
│   │   ├── features/          ← Feature modules (auth, orders, kitchen…)
│   │   ├── guards/            ← ProtectedRoute (RBAC)
│   │   ├── hooks/             ← Custom hooks + API hooks
│   │   ├── layouts/           ← AdminLayout, TabletLayout, CustomerLayout
│   │   ├── lib/               ← supabase.ts, logger.ts, utils.ts
│   │   ├── pages/             ← Page components by domain
│   │   ├── services/          ← External services (WhatsApp)
│   │   ├── store/             ← Zustand stores
│   │   ├── App.tsx            ← Routes + lazy loading
│   │   └── main.tsx           ← Entry point
│   ├── public/                ← Static assets
│   ├── vercel.json            ← Vercel deployment config
│   ├── vite.config.ts
│   └── package.json
│
├── supabase/                  ← Database, Edge Functions, Migrations
│   ├── functions/
│   │   └── manage-users/      ← Privileged user creation (Deno)
│   ├── migrations/
│   │   ├── phase2_schema.sql
│   │   ├── phase3_indexes.sql
│   │   └── phase4_customer_rls.sql
│   └── schema.sql             ← Full database schema + RLS
│
├── shared/                    ← Shared TypeScript types
│   └── types/
│       └── index.ts
│
├── docs/                      ← Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── SUPABASE_SETUP.md
│   ├── QUICK_DEPLOY.md
│   └── OPTIMIZATION_REPORT.md
│
├── scripts/                   ← Deployment & setup scripts
│   ├── setup-dev.sh
│   ├── deploy-frontend.sh
│   ├── deploy-supabase.sh
│   └── run-migrations.sh
│
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml    ← Lint + type-check + build on PR
│       └── deploy-production.yml ← Auto-deploy to Vercel on main
│
├── .env.example               ← Environment variable template
├── .gitignore
└── package.json               ← Workspace root
```

---

## 🚀 Quick Start

```bash
# 1. Install frontend dependencies
cd frontend && npm install

# 2. Configure environment
cp .env.example frontend/.env
# Edit frontend/.env — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
```

App runs at **http://localhost:5173**

---

## 🏗️ Architecture

```
Browser (React SPA)
      │
      │  HTTPS + WebSocket
      ▼
Supabase Cloud
  ├── PostgreSQL (data + RLS)
  ├── Auth (JWT sessions)
  ├── Realtime (live order updates)
  ├── Storage (menu images)
  └── Edge Functions (privileged ops)
```

No separate backend server — Supabase handles everything.

---

## 🚢 Deploy

### Frontend → Vercel
```bash
cd frontend
vercel --prod
```

### Supabase Edge Functions
```bash
supabase functions deploy manage-users
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `VITE_WHATSAPP_PHONE_NUMBER_ID` | ❌ | Meta WhatsApp API |
| `VITE_WHATSAPP_ACCESS_TOKEN` | ❌ | Meta WhatsApp API |

---

## 📚 Docs

| File | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Full deployment guide |
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | DB setup + RLS |
| [docs/QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) | Quick reference |

---

## 👥 User Roles

| Role | Dashboard | Access |
|---|---|---|
| `SUPER_ADMIN` | `/super-admin` | All restaurants |
| `RESTAURANT_ADMIN` | `/admin` | Full management |
| `MANAGER` | `/admin` | Shared with admin |
| `WAITER` | `/waiter` | Orders + tables |
| `KITCHEN` | `/kitchen` | KDS |
| `CASHIER` | `/admin/billing` | Billing only |
| `CUSTOMER` | `/m/:id/:tableId` | QR menu (no login) |
