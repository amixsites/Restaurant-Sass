# WhatsApp Automation Service

Python service for WhatsApp notifications and automation.

## Features
- Order confirmation messages
- Order ready notifications
- Daily sales reports to admin
- Customer feedback requests
- Promotional messages

## Setup
```bash
cd python-services/whatsapp-automation
pip install -r requirements.txt
```

## Usage
```bash
# Send order confirmation
python send_notification.py --type order-confirmation --order-id <uuid>

# Send daily report
python send_notification.py --type daily-report --restaurant-id <uuid>
```

## Environment Variables
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
WHATSAPP_PHONE_NUMBER_ID=your-meta-phone-id
WHATSAPP_ACCESS_TOKEN=your-meta-access-token
```
