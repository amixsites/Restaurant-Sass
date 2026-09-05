# Bill Generator Service

Python service for generating PDF invoices/bills for completed orders.

## Features
- Generate professional PDF invoices
- Include restaurant branding
- GST calculation
- QR code for payment
- Email delivery (optional)

## Setup
```bash
cd python-services/bill-generator
pip install -r requirements.txt
```

## Usage
```bash
python generate_bill.py --order-id <order-uuid>
```

## Environment Variables
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
```
