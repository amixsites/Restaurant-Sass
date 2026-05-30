# Analytics AI Service

Python service for advanced analytics and AI-powered insights.

## Features
- Sales forecasting
- Demand prediction
- Menu optimization recommendations
- Customer behavior analysis
- Peak hours detection
- Inventory optimization

## Setup
```bash
cd python-services/analytics-ai
pip install -r requirements.txt
```

## Usage
```bash
# Generate weekly report
python analyze.py --restaurant-id <uuid> --period weekly

# Get menu recommendations
python analyze.py --restaurant-id <uuid> --type menu-optimization
```

## Environment Variables
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-key (optional)
```
