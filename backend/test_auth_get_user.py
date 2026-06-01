import os
from supabase import create_client

url = "https://rwstxbialzgolomzjayt.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3c3R4YmlhbHpnb2xvbXpqYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Njc0MzIsImV4cCI6MjA5NTI0MzQzMn0.0Hzmbrj311nyvzdrJOyJ5R-9R1PnlrzssQ2FQKMpVX4"

client = create_client(url, key)

email = "botadmin-restaurant-8@gmail.com"
password = "password123"

print("Signing in...")
res = client.auth.sign_in_with_password({"email": email, "password": password})
token = res.session.access_token

# Create client and set header just like main.py does
auth_client = create_client(url, key)
auth_client.options.headers.update({"Authorization": f"Bearer {token}"})

print("\nCalling auth_client.auth.get_user()...")
try:
    user_res = auth_client.auth.get_user()
    print("User returned:", user_res.user)
except Exception as e:
    print("get_user failed with exception:", e)

print("\nCalling auth_client.auth.get_user(token)...")
try:
    user_res = auth_client.auth.get_user(token)
    print("User with token parameter returned:", user_res.user)
except Exception as e:
    print("get_user(token) failed with exception:", e)
