#!/bin/bash
# Deploy Supabase Edge Functions

echo "🚀 Deploying Supabase Edge Functions..."

# Login to Supabase (if not already logged in)
supabase login

# Link to project
echo "🔗 Linking to Supabase project..."
read -p "Enter your Supabase project ref: " PROJECT_REF
supabase link --project-ref $PROJECT_REF

# Deploy all edge functions
echo "☁️  Deploying edge functions..."
supabase functions deploy manage-users

echo "✅ Supabase edge functions deployed successfully!"
