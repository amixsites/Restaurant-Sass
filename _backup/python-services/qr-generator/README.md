# QR Code Generator Service

Python service for generating QR codes for restaurant tables.

## Features
- Generate QR codes for table menus
- Upload to Supabase Storage
- Batch generation for all tables
- Custom branding/logo overlay

## Setup
```bash
cd python-services/qr-generator
pip install -r requirements.txt
```

## Usage
```bash
# Generate QR for single table
python generate_qr.py --restaurant-id <uuid> --table-id <uuid>

# Generate QR for all tables in a restaurant
python generate_qr.py --restaurant-id <uuid> --all-tables
```

## Environment Variables
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
FRONTEND_URL=https://your-domain.com
```
