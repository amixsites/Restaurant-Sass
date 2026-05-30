# Cleanup Jobs Service

Python service for scheduled database cleanup and maintenance tasks.

## Features
- Archive old completed orders
- Clean up expired sessions
- Remove old analytics data
- Optimize database indexes
- Generate backup reports

## Setup
```bash
cd python-services/cleanup-jobs
pip install -r requirements.txt
```

## Usage
```bash
# Run cleanup manually
python cleanup.py --task archive-orders --days 90

# Run scheduled cleanup (runs continuously)
python scheduler.py
```

## Environment Variables
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
ARCHIVE_AFTER_DAYS=90
```
