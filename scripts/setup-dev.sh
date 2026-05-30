#!/bin/bash
# Setup development environment

echo "🔧 Setting up development environment..."

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend
npm install
cp .env.example .env
echo "✅ Frontend setup complete. Please edit frontend/.env with your Supabase credentials."

# Python services setup
echo "🐍 Setting up Python services..."
cd ../python-services

for service in whatsapp-automation qr-generator bill-generator analytics-ai cleanup-jobs; do
  echo "Setting up $service..."
  cd $service
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  deactivate
  cd ..
done

echo "✅ Python services setup complete!"

cd ..

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit frontend/.env with your Supabase credentials"
echo "2. Run 'cd frontend && npm run dev' to start the frontend"
echo "3. Configure Python services as needed"
