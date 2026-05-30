#!/bin/bash
# Deploy frontend to Vercel

echo "🚀 Deploying Frontend to Vercel..."

cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run type check
echo "🔍 Running type check..."
npm run type-check

# Build
echo "🏗️  Building..."
npm run build

# Deploy to Vercel
echo "☁️  Deploying to Vercel..."
vercel --prod

echo "✅ Frontend deployed successfully!"
