import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

def main():
    print(f"Connecting to: {SUPABASE_URL}")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Attempt to run the exact query that fails in the frontend
        print("Testing query: select('*').neq('role', 'SUPER_ADMIN')")
        res = client.table("users").select("*").neq("role", "SUPER_ADMIN").execute()
        print("Success! Data:", res.data)
    except Exception as e:
        print("Query failed with exception:")
        print(e)

if __name__ == "__main__":
    main()
