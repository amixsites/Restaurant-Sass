import os
import sys
import time
import requests
import secrets
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables from root .env
load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")
BACKEND_URL = "http://127.0.0.1:8000"

def main():
    print("==========================================================")
    print("      POS SYSTEM DATA SEEDING & END-TO-END VALIDATION     ")
    print("==========================================================")
    
    # Initialize Super Admin Client
    print(f"Connecting to Supabase at: {SUPABASE_URL}")
    super_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # We will accumulate execution results for our final report
    summary = []
    
    def log_result(phase: int, name: str, success: bool, details: str = ""):
        status_str = "PASS" if success else "FAIL"
        msg = f"[Phase {phase}] {name}: {status_str}"
        if details:
            msg += f" - {details}"
        print(msg)
        summary.append({
            "phase": phase,
            "name": name,
            "success": success,
            "details": details
        })

    # --- Phase 1: Super Admin Login ---
    print("\n--- Phase 1: Super Admin Login ---")
    super_token = None
    try:
        res = super_client.auth.sign_in_with_password({"email": "amixsites@gmail.com", "password": "amixsites"})
        super_token = res.session.access_token
        super_client.options.headers.update({"Authorization": f"Bearer {super_token}"})
        
        # Verify role in public.users
        role_res = super_client.table("users").select("role").eq("id", res.user.id).single().execute()
        role = role_res.data.get("role")
        log_result(1, "Super Admin Login", True, f"Logged in as {res.user.email} (Role: {role})")
    except Exception as e:
        log_result(1, "Super Admin Login", False, str(e))
        print("Cannot proceed without Super Admin credentials. Exiting.")
        sys.exit(1)

    # --- Phase 2: Create Restaurants ---
    print("\n--- Phase 2: Create Restaurants ---")
    restaurants_data = [
        {"name": "Paradise Restaurant", "slug": "paradise-restaurant", "phone": "111-222-3333", "address": "1 Paradise Rd, Foodville"},
        {"name": "Spice Garden", "slug": "spice-garden", "phone": "222-333-4444", "address": "2 Spice Garden Ave, Currytown"},
        {"name": "Urban Tandoor", "slug": "urban-tandoor", "phone": "333-444-5555", "address": "3 Urban St, City Centre"}
    ]
    restaurants = {}
    
    for rdata in restaurants_data:
        try:
            # Check if restaurant already exists by slug
            exist_res = super_client.table("restaurants").select("id").eq("slug", rdata["slug"]).execute()
            if exist_res.data:
                rest_id = exist_res.data[0]["id"]
                # Update existing
                super_client.table("restaurants").update(rdata).eq("id", rest_id).execute()
                log_result(2, f"Restaurant '{rdata['name']}'", True, f"Reused existing ID: {rest_id}")
            else:
                # Insert new
                new_res = super_client.table("restaurants").insert(rdata).execute()
                rest_id = new_res.data[0]["id"]
                log_result(2, f"Restaurant '{rdata['name']}'", True, f"Created new ID: {rest_id}")
            restaurants[rdata["name"]] = rest_id
            
            # Ensure an active subscription exists for the restaurant
            sub_check = super_client.table("subscriptions").select("id").eq("restaurant_id", rest_id).execute()
            if not sub_check.data:
                super_client.table("subscriptions").insert({
                    "restaurant_id": rest_id,
                    "plan_name": "Pro Trial",
                    "status": "active",
                    "valid_until": "2030-12-31T23:59:59+00:00"
                }).execute()
                print(f"Created Pro Trial subscription for restaurant: {rdata['name']}")
        except Exception as e:
            log_result(2, f"Restaurant '{rdata['name']}' creation", False, str(e))

    # --- Phase 3: Create Restaurant Admins ---
    print("\n--- Phase 3: Create Restaurant Admins ---")
    admin_credentials = [
        {"email": "admin1@test.com", "password": "Admin@123", "restaurant_name": "Paradise Restaurant"},
        {"email": "admin2@test.com", "password": "Admin@123", "restaurant_name": "Spice Garden"},
        {"email": "admin3@test.com", "password": "Admin@123", "restaurant_name": "Urban Tandoor"}
    ]
    admin_tokens = {}
    
    for credentials in admin_credentials:
        email = credentials["email"]
        password = credentials["password"]
        rname = credentials["restaurant_name"]
        rest_id = restaurants.get(rname)
        
        if not rest_id:
            log_result(3, f"Admin '{email}' setup", False, f"Skipped: restaurant '{rname}' was not created.")
            continue
            
        try:
            # 1. Check if admin can already sign in
            print(f"Attempting login for {email}...")
            admin_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            try:
                login_res = admin_client.auth.sign_in_with_password({"email": email, "password": password})
                admin_tokens[rname] = login_res.session.access_token
                # Make sure the role and restaurant_id in public.users are correct
                super_client.table("users").upsert({
                    "id": login_res.user.id,
                    "email": email,
                    "full_name": f"Admin for {rname}",
                    "role": "admin",
                    "restaurant_id": rest_id,
                    "is_active": True
                }).execute()
                log_result(3, f"Admin '{email}' Login", True, f"Reused existing credentials and updated profile. ID: {login_res.user.id}")
            except Exception as login_err:
                # 2. Login failed: Create user via deployed edge function
                print(f"Login failed: {login_err}. Attempting creation via Deno Edge function...")
                func_url = f"{SUPABASE_URL}/functions/v1/manage-users"
                headers = {
                    "Authorization": f"Bearer {super_token}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "email": email,
                    "password": password,
                    "fullName": f"Admin for {rname}",
                    "phone": "000-000-0000",
                    "role": "admin",
                    "restaurantId": rest_id
                }
                func_res = requests.post(func_url, headers=headers, json=payload)
                if func_res.status_code == 200:
                    user_id = func_res.json().get("userId")
                    # Try login again to acquire token
                    login_res = admin_client.auth.sign_in_with_password({"email": email, "password": password})
                    admin_tokens[rname] = login_res.session.access_token
                    log_result(3, f"Admin '{email}' Creation", True, f"Created via Edge function. ID: {user_id}")
                else:
                    raise Exception(f"Edge function returned status {func_res.status_code}: {func_res.text}")
        except Exception as e:
            log_result(3, f"Admin '{email}' setup", False, str(e))

    # --- Phase 4: Create Tables ---
    print("\n--- Phase 4: Create Tables ---")
    table_numbers = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "VIP Table"]
    tables_map = {} # Maps (restaurant_name, table_number) -> table_id
    
    for rname, rest_id in restaurants.items():
        admin_token = admin_tokens.get(rname)
        # Create an authorized client for this restaurant
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        if admin_token:
            client.options.headers.update({"Authorization": f"Bearer {admin_token}"})
        else:
            client.options.headers.update({"Authorization": f"Bearer {super_token}"})
            
        for tnum in table_numbers:
            capacity = 10 if "VIP" in tnum else 4
            ttype = "VIP" if "VIP" in tnum else "standard"
            try:
                # Check if table already exists
                exist_res = client.table("tables").select("id").eq("restaurant_id", rest_id).eq("table_number", tnum).execute()
                if exist_res.data:
                    table_id = exist_res.data[0]["id"]
                    log_result(4, f"{rname} - {tnum}", True, f"Reused ID: {table_id}")
                else:
                    new_res = client.table("tables").insert({
                        "restaurant_id": rest_id,
                        "table_number": tnum,
                        "table_name": tnum,
                        "capacity": capacity,
                        "table_type": ttype,
                        "status": "available"
                    }).execute()
                    table_id = new_res.data[0]["id"]
                    log_result(4, f"{rname} - {tnum}", True, f"Created ID: {table_id}")
                tables_map[(rname, tnum)] = table_id
            except Exception as e:
                log_result(4, f"{rname} - {tnum} creation", False, str(e))

    # --- Phase 5: QR Generation ---
    print("\n--- Phase 5: QR Generation ---")
    for (rname, tnum), table_id in tables_map.items():
        admin_token = admin_tokens.get(rname) or super_token
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        try:
            # Attempt to call generating endpoint
            qr_gen_url = f"{BACKEND_URL}/api/tables/{table_id}/generate-qr"
            res = requests.post(qr_gen_url, headers=headers)
            
            if res.status_code == 200:
                qr_token = res.json().get("qr_token")
                log_result(5, f"QR Generation for {rname} {tnum}", True, f"Generated token: {qr_token}")
            elif res.status_code == 400 and "QR_ALREADY_EXISTS" in res.text:
                # Get the existing token
                table_res = super_client.table("tables").select("qr_token").eq("id", table_id).single().execute()
                qr_token = table_res.data.get("qr_token")
                log_result(5, f"QR Fetch for {rname} {tnum}", True, f"Reused existing token: {qr_token}")
            else:
                raise Exception(f"Endpoint returned {res.status_code}: {res.text}")
                
            # Verify the scan URL resolves correctly
            scan_url = f"{BACKEND_URL}/order/{qr_token}"
            scan_res = requests.get(scan_url)
            if scan_res.status_code == 200:
                log_result(5, f"Scan Verification for {rname} {tnum}", True, f"Resolves successfully.")
            else:
                raise Exception(f"Scan returned status {scan_res.status_code}: {scan_res.text}")
        except Exception as e:
            log_result(5, f"QR Generation for {rname} {tnum}", False, str(e))

    # --- Phase 6: Categories ---
    print("\n--- Phase 6: Create Categories ---")
    categories_data = [
        {"name": "Starters", "sort_order": 1},
        {"name": "Main Course", "sort_order": 2},
        {"name": "Chinese", "sort_order": 3},
        {"name": "Drinks", "sort_order": 4},
        {"name": "Desserts", "sort_order": 5}
    ]
    categories_map = {} # Maps (restaurant_name, category_name) -> category_id
    
    for rname, rest_id in restaurants.items():
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.options.headers.update({"Authorization": f"Bearer {admin_tokens.get(rname) or super_token}"})
        
        for cdata in categories_data:
            try:
                exist_res = client.table("menu_categories").select("id").eq("restaurant_id", rest_id).eq("name", cdata["name"]).execute()
                if exist_res.data:
                    cat_id = exist_res.data[0]["id"]
                    log_result(6, f"{rname} - Category '{cdata['name']}'", True, f"Reused ID: {cat_id}")
                else:
                    new_res = client.table("menu_categories").insert({
                        "restaurant_id": rest_id,
                        "name": cdata["name"],
                        "sort_order": cdata["sort_order"],
                        "is_active": True
                    }).execute()
                    cat_id = new_res.data[0]["id"]
                    log_result(6, f"{rname} - Category '{cdata['name']}'", True, f"Created ID: {cat_id}")
                categories_map[(rname, cdata["name"])] = cat_id
            except Exception as e:
                log_result(6, f"{rname} - Category '{cdata['name']}' creation", False, str(e))

    # --- Phase 7: Create Menu Items ---
    print("\n--- Phase 7: Create Menu Items ---")
    menu_items_data = {
        "Starters": [
            {"name": "Paneer Tikka", "price": 200.0, "type": "veg", "description": "Grilled marinated paneer cubes with bell peppers"},
            {"name": "Veg Manchurian", "price": 180.0, "type": "veg", "description": "Fried vegetable balls in tangy Manchurian sauce"},
            {"name": "Gobi 65", "price": 160.0, "type": "veg", "description": "Spicy, deep fried cauliflower florets"}
        ],
        "Main Course": [
            {"name": "Veg Biryani", "price": 250.0, "type": "veg", "description": "Fragrant basmati rice layered with vegetables and spices"},
            {"name": "Butter Naan", "price": 40.0, "type": "veg", "description": "Leavened oven-baked flatbread with butter"},
            {"name": "Paneer Butter Masala", "price": 220.0, "type": "veg", "description": "Cottage cheese in rich tomato-cream sauce"}
        ],
        "Chinese": [
            {"name": "Fried Rice", "price": 180.0, "type": "veg", "description": "Stir-fried rice with vegetables and soy sauce"},
            {"name": "Noodles", "price": 170.0, "type": "veg", "description": "Stir-fried noodles with crisp vegetables"}
        ],
        "Drinks": [
            {"name": "Coke", "price": 50.0, "type": "veg", "description": "Chilled soft drink"},
            {"name": "Sprite", "price": 50.0, "type": "veg", "description": "Chilled lemon-lime soft drink"},
            {"name": "Mango Juice", "price": 80.0, "type": "veg", "description": "Thick sweet Alphonso mango juice"}
        ],
        "Desserts": [
            {"name": "Gulab Jamun", "price": 90.0, "type": "veg", "description": "Deep fried berry sized milk balls in sugar syrup"},
            {"name": "Ice Cream", "price": 100.0, "type": "veg", "description": "Creamy double vanilla ice cream scoop"}
        ]
    }
    menu_items_map = {} # Maps (restaurant_name, item_name) -> item_id
    
    for rname, rest_id in restaurants.items():
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.options.headers.update({"Authorization": f"Bearer {admin_tokens.get(rname) or super_token}"})
        
        for cat_name, items in menu_items_data.items():
            cat_id = categories_map.get((rname, cat_name))
            if not cat_id:
                continue
                
            for idata in items:
                try:
                    exist_res = client.table("menu_items").select("id").eq("restaurant_id", rest_id).eq("category_id", cat_id).eq("name", idata["name"]).execute()
                    if exist_res.data:
                        item_id = exist_res.data[0]["id"]
                        log_result(7, f"{rname} - Menu Item '{idata['name']}'", True, f"Reused ID: {item_id}")
                    else:
                        new_res = client.table("menu_items").insert({
                            "restaurant_id": rest_id,
                            "category_id": cat_id,
                            "name": idata["name"],
                            "price": idata["price"],
                            "type": idata["type"],
                            "description": idata["description"],
                            "is_available": True
                        }).execute()
                        item_id = new_res.data[0]["id"]
                        log_result(7, f"{rname} - Menu Item '{idata['name']}'", True, f"Created ID: {item_id}")
                    menu_items_map[(rname, idata["name"])] = item_id
                except Exception as e:
                    log_result(7, f"{rname} - Menu Item '{idata['name']}' creation", False, str(e))

    # --- Phase 8: Order Testing ---
    print("\n--- Phase 8: Order Testing ---")
    orders_created = [] # List of created order objects
    
    for rname, rest_id in restaurants.items():
        admin_token = admin_tokens.get(rname) or super_token
        
        # We will create orders for Table 1 and Table 2
        for tnum, order_spec in [("Table 1", "Order 1"), ("Table 2", "Order 2")]:
            table_id = tables_map.get((rname, tnum))
            if not table_id:
                continue
                
            try:
                # 1. Fetch QR token for the table
                t_res = super_client.table("tables").select("qr_token").eq("id", table_id).single().execute()
                qr_token = t_res.data.get("qr_token")
                
                # 2. Get customer session via scan endpoint
                scan_url = f"{BACKEND_URL}/order/{qr_token}"
                scan_res = requests.get(scan_url)
                session_id = scan_res.json().get("session_id")
                
                # 3. Build order items payload
                items_input = []
                if order_spec == "Order 1":
                    paneer_id = menu_items_map.get((rname, "Paneer Tikka"))
                    coke_id = menu_items_map.get((rname, "Coke"))
                    if paneer_id and coke_id:
                        items_input = [
                            {"menu_item_id": paneer_id, "quantity": 1, "notes": "Medium spicy"},
                            {"menu_item_id": coke_id, "quantity": 1, "notes": "Cold"}
                        ]
                else: # Order 2
                    biryani_id = menu_items_map.get((rname, "Veg Biryani"))
                    jamun_id = menu_items_map.get((rname, "Gulab Jamun"))
                    if biryani_id and jamun_id:
                        items_input = [
                            {"menu_item_id": biryani_id, "quantity": 1, "notes": "Double masala"},
                            {"menu_item_id": jamun_id, "quantity": 1, "notes": "Warm"}
                        ]
                
                if not items_input:
                    raise Exception("Menu items missing for order placement")
                    
                # 4. Place order via API
                place_payload = {
                    "session_id": session_id,
                    "customer_name": "QA Tester",
                    "customer_phone": "9999999999",
                    "items": items_input
                }
                order_place_url = f"{BACKEND_URL}/api/orders/place"
                order_res = requests.post(order_place_url, json=place_payload)
                
                if order_res.status_code == 200:
                    order_data = order_res.json().get("order")
                    order_items_data = order_res.json().get("items")
                    order_id = order_data["id"]
                    
                    log_result(8, f"{rname} - {tnum} Order", True, f"Placed successfully. ID: {order_id}, Total: {order_data['total_amount']}")
                    orders_created.append({
                        "restaurant_name": rname,
                        "restaurant_id": rest_id,
                        "table_id": table_id,
                        "table_number": tnum,
                        "order_id": order_id,
                        "admin_token": admin_token,
                        "items": order_items_data
                    })
                else:
                    raise Exception(f"Place order failed: {order_res.status_code} - {order_res.text}")
            except Exception as e:
                log_result(8, f"{rname} - {tnum} Order placement", False, str(e))

    # --- Phase 9: Kitchen KDS ---
    print("\n--- Phase 9: Kitchen KDS ---")
    for order_info in orders_created:
        order_id = order_info["order_id"]
        rname = order_info["restaurant_name"]
        tnum = order_info["table_number"]
        admin_token = order_info["admin_token"]
        
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.options.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        try:
            # 1. Update status to PREPARING
            client.table("orders").update({"status": "PREPARING"}).eq("id", order_id).execute()
            # Also update items status to PREPARING
            client.table("order_items").update({"status": "PREPARING"}).eq("order_id", order_id).execute()
            log_result(9, f"KDS Preparing: {rname} - {tnum}", True, "Advanced status to PREPARING")
            
            # 2. Update status to COMPLETED
            client.table("orders").update({"status": "COMPLETED"}).eq("id", order_id).execute()
            # Also update items status to COMPLETED
            client.table("order_items").update({"status": "COMPLETED"}).eq("order_id", order_id).execute()
            log_result(9, f"KDS Completed: {rname} - {tnum}", True, "Advanced status to COMPLETED")
        except Exception as e:
            log_result(9, f"KDS Transition: {rname} - {tnum}", False, str(e))

    # --- Phase 10: Billing ---
    print("\n--- Phase 10: Billing ---")
    invoices_created = []
    
    for order_info in orders_created:
        order_id = order_info["order_id"]
        rest_id = order_info["restaurant_id"]
        rname = order_info["restaurant_name"]
        tnum = order_info["table_number"]
        admin_token = order_info["admin_token"]
        
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        client.options.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        try:
            # Fetch order details to verify totals
            ord_res = client.table("orders").select("total_amount").eq("id", order_id).single().execute()
            grand_total = float(ord_res.data["total_amount"])
            
            # Calculate breakdown (5% tax)
            # grand_total = subtotal + tax = subtotal * 1.05
            subtotal = round(grand_total / 1.05, 2)
            tax_amount = round(grand_total - subtotal, 2)
            
            inv_number = f"INV-{secrets.token_hex(3).upper()}"
            
            # Create Invoice
            inv_payload = {
                "restaurant_id": rest_id,
                "order_id": order_id,
                "invoice_number": inv_number,
                "subtotal": subtotal,
                "tax_amount": tax_amount,
                "discount_amount": 0.00,
                "total_amount": grand_total,
                "payment_method": "UPI",
                "payment_status": "paid"
            }
            inv_res = client.table("invoices").insert(inv_payload).execute()
            invoice_id = inv_res.data[0]["id"]
            
            # Release Table (make available)
            client.table("tables").update({"status": "available", "current_order_id": None}).eq("id", order_info["table_id"]).execute()
            
            log_result(10, f"Billing for {rname} - {tnum}", True, f"Generated Invoice: {inv_number}, Paid: {grand_total}")
            invoices_created.append({
                "restaurant_name": rname,
                "table_number": tnum,
                "invoice_number": inv_number,
                "subtotal": subtotal,
                "tax_amount": tax_amount,
                "total_amount": grand_total,
                "items": order_info["items"]
            })
        except Exception as e:
            log_result(10, f"Billing for {rname} - {tnum}", False, str(e))

    # --- Phase 11: Receipt Printing ---
    print("\n--- Phase 11: Receipt Printing ---")
    for inv in invoices_created:
        try:
            # Generate readable receipt text
            receipt = []
            receipt.append("==========================================")
            receipt.append(f"           {inv['restaurant_name'].upper()}           ")
            receipt.append(f"   Table: {inv['table_number']}  |  Inv: {inv['invoice_number']}   ")
            receipt.append("==========================================")
            receipt.append(f"{'Item Name':<25} {'Qty':<5} {'Total':<10}")
            receipt.append("------------------------------------------")
            
            for item in inv["items"]:
                # Fetch menu item name
                mi_res = super_client.table("menu_items").select("name").eq("id", item["menu_item_id"]).single().execute()
                iname = mi_res.data.get("name", "Unknown Item")
                receipt.append(f"{iname:<25} {item['quantity']:<5} {float(item['total_price']):<10.2f}")
                
            receipt.append("------------------------------------------")
            receipt.append(f"{'Subtotal:':<30} {inv['subtotal']:<10.2f}")
            receipt.append(f"{'Tax (5%):':<30} {inv['tax_amount']:<10.2f}")
            receipt.append(f"{'Grand Total:':<30} {inv['total_amount']:<10.2f}")
            receipt.append("==========================================")
            receipt.append("      Thank you! Please visit again.      ")
            receipt.append("==========================================")
            
            receipt_str = "\n".join(receipt)
            print(f"\nGenerated Receipt for {inv['restaurant_name']} {inv['table_number']}:\n")
            print(receipt_str)
            
            # Save receipt in temp file to mock printing save
            receipt_dir = os.path.join(os.path.dirname(__file__), "receipts")
            os.makedirs(receipt_dir, exist_ok=True)
            receipt_path = os.path.join(receipt_dir, f"{inv['invoice_number']}.txt")
            with open(receipt_path, "w", encoding="utf-8") as rf:
                rf.write(receipt_str)
                
            log_result(11, f"Receipt for {inv['restaurant_name']} - {inv['table_number']}", True, f"Printed to file: {receipt_path}")
        except Exception as e:
            log_result(11, f"Receipt for {inv['restaurant_name']}", False, str(e))

    # --- Phase 12: Analytics ---
    print("\n--- Phase 12: Analytics ---")
    for rname, rest_id in restaurants.items():
        admin_token = admin_tokens.get(rname) or super_token
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        try:
            analytics_url = f"{BACKEND_URL}/api/analytics/{rest_id}?range=Weekly"
            res = requests.get(analytics_url, headers=headers)
            
            if res.status_code == 200:
                adata = res.json()
                total_rev = adata.get("total_revenue", 0)
                orders_count = adata.get("total_orders", 0)
                log_result(12, f"Analytics for {rname}", True, f"Revenue: {total_rev}, Orders: {orders_count}")
            else:
                raise Exception(f"Analytics returned status {res.status_code}: {res.text}")
        except Exception as e:
            log_result(12, f"Analytics for {rname}", False, str(e))

    # --- Phase 13: Schema Mismatch Sanity Checks ---
    print("\n--- Phase 13: Schema Mismatch Sanity Checks ---")
    try:
        # Check users query
        users_check = super_client.table("users").select("*").neq("role", "superadmin").execute()
        log_result(13, "Frontend query '.neq(\"role\", \"superadmin\")'", True, f"Returned {len(users_check.data)} records successfully.")
        
        # Check restaurants select columns
        rest_check = super_client.table("restaurants").select("name, slug, phone, address").limit(1).execute()
        log_result(13, "Frontend query select('name, slug, phone, address')", True, f"Returned successfully. Columns: {rest_check.data[0].keys() if rest_check.data else []}")
    except Exception as e:
        log_result(13, "Schema Mismatch Sanity Check", False, str(e))

    print("\n==========================================================")
    print("                    SEEDING SUMMARY                       ")
    print("==========================================================")
    for res in summary:
        status_str = "PASS" if res["success"] else "FAIL"
        print(f"[Phase {res['phase']}] {res['name']:<40} : {status_str}")
        
if __name__ == "__main__":
    main()
