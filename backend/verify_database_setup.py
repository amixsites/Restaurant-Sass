import os
import sys
import requests

# Load env variables from root .env
env_path = r"../.env"
supabase_url = None
supabase_key = None

if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split('=', 1)
            if len(parts) == 2:
                key, val = parts[0].strip(), parts[1].strip()
                val = val.strip("'\"")
                if key == 'VITE_SUPABASE_URL':
                    supabase_url = val
                elif key == 'VITE_SUPABASE_ANON_KEY':
                    supabase_key = val

print(f"Supabase URL found: {supabase_url is not None}")
print(f"Supabase Key found: {supabase_key is not None}")

if not supabase_url or not supabase_key:
    print("Could not find Supabase URL/Key in root .env")
    sys.exit(1)

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

# 1. Check if we can read from tables
print("\n--- Verifying tables ---")
url = f"{supabase_url}/rest/v1/tables?select=id,table_number,capacity,status,qr_token&limit=5"
try:
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        print("Success! 'tables' query returned status 200.")
        print("Tables count:", len(res.json()))
        print("Data:", res.json())
    else:
        print(f"Error querying 'tables': {res.status_code} - {res.text}")
except Exception as e:
    print("Error connecting to tables:", e)

# 2. Check if customer_sessions table exists
print("\n--- Verifying customer_sessions table ---")
url = f"{supabase_url}/rest/v1/customer_sessions?select=*&limit=1"
try:
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        print("Success! 'customer_sessions' table exists.")
        print("Sample data:", res.json())
    else:
        print(f"Error querying 'customer_sessions': {res.status_code} - {res.text}")
except Exception as e:
    print("Error connecting to customer_sessions:", e)

# 3. Check if orders.approval_status exists
print("\n--- Verifying orders.approval_status ---")
url = f"{supabase_url}/rest/v1/orders?select=id,status,approval_status&limit=1"
try:
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        print("Success! 'orders' table exists and has 'approval_status' column.")
        print("Sample data:", res.json())
    else:
        print(f"Error querying 'orders': {res.status_code} - {res.text}")
except Exception as e:
    print("Error connecting to orders:", e)
