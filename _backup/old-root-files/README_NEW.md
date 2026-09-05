# 🍽️ Restaurant POS SaaS — Scalable Architecture

A modern, production-ready, multi-tenant Restaurant Point of Sale system with microservices architecture.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)]()
[![React](https://img.shields.io/badge/React-19-61dafb)]()
[![Python](https://img.shields.io/badge/Python-3.11-blue)]()
[![Supabase](https://img.shields.io/badge/Supabase-Powered-3ecf8e)]()

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│                  Feature-Based Architecture                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   Auth   │  Orders  │  Kitchen │   Menu   │ Billing  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                           │                                  │
│                           ▼                                  │
│                  ┌─────────────────┐                        │
│                  │  Supabase Client │                        │
│                  └─────────────────┘                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + Auth + Realtime + Storage + Functions  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              PYTHON MICROSERVICES (Optional)                 │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ WhatsApp │    QR    │   Bill   │    AI    │ Cleanup  │  │
│  │   Auto   │Generator │Generator │Analytics │   Jobs   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
restaurant-pos/
├── frontend/              # React + Vite SPA
├── supabase/             # Database & Edge Functions
├── python-services/      # Optional microservices
├── shared/               # Shared TypeScript types
├── docs/                 # Documentation
├── scripts/              # Deployment scripts
└── .github/              # CI/CD workflows
```

---

## ✨ Features

### 🏢 Multi-Tenant SaaS
- Complete tenant isolation with RLS
- Subscription management
- Super Admin dashboard

### 👥 Role-Based Access Control
- Super Admin, Restaurant Admin, Manager
- Waiter, Kitchen, Cashier
- Customer (QR menu, no login)

### 📱 Customer Experience
- QR code menu scanning
- Real-time order tracking
- Cart management

### 🍳 Kitchen Display System
- Real-time order notifications
- Drag-and-drop status updates
- Visual order queue

### 💰 Billing & Payments
- GST calculation
- Multiple payment methods
- PDF invoice generation
- Refund processing

### 📊 Analytics
- Real-time dashboards
- Sales tracking
- Top-selling items
- AI-powered insights (optional)

### 🐍 Python Microservices
- WhatsApp automation
- QR code generation
- PDF bill generation
- AI analytics
- Database cleanup

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (for microservices)
- Supabase account
- Vercel account (for deployment)

### Development Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd restaurant-pos

# 2. Setup development environment
bash scripts/setup-dev.sh

# 3. Configure environment
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm run dev
```

App runs at: http://localhost:5173

---

## 📦 Frontend Structure

```
frontend/src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication & RBAC
│   ├── orders/           # Order management
│   ├── kitchen/          # Kitchen Display System
│   ├── menu/             # Menu management
│   ├── billing/          # Billing & invoicing
│   ├── analytics/        # Dashboards & reports
│   ├── inventory/        # Inventory (placeholder)
│   └── whatsapp/         # WhatsApp integration
│
├── shared/               # Shared resources
│   ├── components/       # UI components (shadcn/ui)
│   ├── hooks/            # Reusable hooks
│   ├── lib/              # Supabase, logger, utils
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
│
├── layouts/              # Layout components
├── App.tsx               # Main app (lazy loading)
└── main.tsx              # Entry point
```

---

## 🐍 Python Services

Each service is independent and optional:

### WhatsApp Automation
```bash
cd python-services/whatsapp-automation
pip install -r requirements.txt
python send_notification.py --type order-confirmation --order-id <uuid>
```

### QR Generator
```bash
cd python-services/qr-generator
pip install -r requirements.txt
python generate_qr.py --restaurant-id <uuid> --all-tables
```

### Bill Generator
```bash
cd python-services/bill-generator
pip install -r requirements.txt
python generate_bill.py --order-id <uuid>
```

### AI Analytics
```bash
cd python-services/analytics-ai
pip install -r requirements.txt
python analyze.py --restaurant-id <uuid> --period weekly
```

### Cleanup Jobs
```bash
cd python-services/cleanup-jobs
pip install -r requirements.txt
python scheduler.py
```

---

## 🚢 Deployment

### Deploy Frontend (Vercel)
```bash
bash scripts/deploy-frontend.sh
```

### Deploy Supabase Edge Functions
```bash
bash scripts/deploy-supabase.sh
```

### Run Database Migrations
```bash
bash scripts/run-migrations.sh
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete guide.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [RESTRUCTURE_COMPLETE.md](RESTRUCTURE_COMPLETE.md) | **START HERE** — Restructuring overview |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide |
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | Database setup |
| [docs/QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) | Quick reference |

---

## 🔧 Scripts

```bash
scripts/setup-dev.sh          # Setup development environment
scripts/deploy-frontend.sh    # Deploy frontend to Vercel
scripts/deploy-supabase.sh    # Deploy edge functions
scripts/run-migrations.sh     # Run database migrations
```

---

## 🤖 CI/CD

GitHub Actions workflows:
- **Frontend CI** — Lint, type-check, build on push
- **Deploy Production** — Auto-deploy to Vercel on main branch

---

## 🎯 Benefits of New Architecture

✅ **Feature-Based** — Self-contained modules  
✅ **Scalable** — Add features easily  
✅ **Maintainable** — Clear code organization  
✅ **Performance** — Lazy loading, code splitting  
✅ **Microservices** — Independent Python services  
✅ **Type-Safe** — Shared TypeScript types  
✅ **CI/CD Ready** — Automated workflows  

---

## 🔒 Security

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Tenant isolation at DB and cache levels
- Security headers configured
- Environment variables never committed

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) — Backend infrastructure
- [Vercel](https://vercel.com/) — Frontend deployment
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [TanStack Query](https://tanstack.com/query) — Data fetching

---

**Built with ❤️ for the restaurant industry**
