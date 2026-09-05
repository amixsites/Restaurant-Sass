import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

def main():
    print(f"Connecting to: {SUPABASE_URL}")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Login as Super Admin
    try:
        res = client.auth.sign_in_with_password({"email": "amixsites@gmail.com", "password": "amixsites"})
        super_token = res.session.access_token
        print("Logged in as Super Admin successfully.")
    except Exception as e:
        print("Failed to login as Super Admin:", e)
        return

    # 2. Try invoking edge function
    func_url = f"{SUPABASE_URL}/functions/v1/manage-users"
    headers = {
        "Authorization": f"Bearer {super_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": "admin1@test.com",
        "password": "Admin@123",
        "fullName": "Test Admin 1",
        "phone": "1234567890",
        "role": "admin", # let's try 'admin' (lowercase) or 'RESTAURANT_ADMIN'
        "restaurantId": "d24e3a50-b7ad-48e4-aeb7-862b9db813d6" # Demo Bistro ID
    }
    
    print(f"Invoking edge function at: {func_url}")
    try:
        response = requests.post(func_url, headers=headers, json=payload)
        print("Status code:", response.status_code)
        print("Response text:", response.text)
    except Exception as e:
        print("HTTP request failed:", e)

if __name__ == "__main__":
    main()
