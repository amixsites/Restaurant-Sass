import os
from supabase import create_client

url = "https://rwstxbialzgolomzjayt.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3c3R4YmlhbHpnb2xvbXpqYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Njc0MzIsImV4cCI6MjA5NTI0MzQzMn0.0Hzmbrj311nyvzdrJOyJ5R-9R1PnlrzssQ2FQKMpVX4"

client = create_client(url, key)

email = "amixsites@gmail.com"
password = "amixsites"

print(f"Signing in as Super Admin ({email})...")
try:
    res = client.auth.sign_in_with_password({"email": email, "password": password})
    token = res.session.access_token
    print("Authenticated successfully.")
    
    auth_client = create_client(url, key)
    auth_client.options.headers.update({"Authorization": f"Bearer {token}"})
    
    print("\nFetching profile from public 'users' table...")
    try:
        profile_res = auth_client.table("users").select("*").eq("id", res.user.id).single().execute()
        print("Profile data:", profile_res.data)
    except Exception as profile_err:
        print("Failed to fetch profile. Exception:", profile_err)
except Exception as auth_err:
    print("Authentication failed:", auth_err)
