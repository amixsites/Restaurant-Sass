import os
import requests
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get('VITE_SUPABASE_URL')
supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY')

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

url = f"{supabase_url}/rest/v1/customer_sessions?select=*&order=created_at.desc&limit=10"
res = requests.get(url, headers=headers)
if res.status_code == 200:
    print("Recent customer sessions:")
    for row in res.json():
        print(f"Session ID: {row.get('session_id')}, Table ID: {row.get('table_id')}, Created At: {row.get('created_at')}")
else:
    print("Failed to query:", res.status_code, res.text)
