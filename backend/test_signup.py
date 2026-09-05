import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

def main():
    print(f"Connecting to: {SUPABASE_URL}")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    email = "admin1.rest.test@gmail.com"
    password = "Password@123"
    
    try:
        # Try signing up
        print("Signing up...")
        res = client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": "admin",
                    "fullName": "Test Signup Admin"
                }
            }
        })
        print("Signup response user:", res.user)
        print("Signup response user ID:", res.user.id if res.user else "None")
    except Exception as e:
        print("Signup failed:", e)
    
    try:
        # Try signing in
        print("Signing in...")
        res2 = client.auth.sign_in_with_password({"email": email, "password": password})
        print("Sign in success! Token acquired.")
        
        # Verify public.users profile
        print("Checking public.users...")
        res3 = client.table("users").select("*").eq("id", res2.user.id).execute()
        print("Profile data:", res3.data)
    except Exception as e:
        print("Sign in failed:", e)

if __name__ == "__main__":
    main()
