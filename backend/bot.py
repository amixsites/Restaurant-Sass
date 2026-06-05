import os
import asyncio
import random
import string
import logging
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any
from supabase import create_client, Client

logger = logging.getLogger("simulation")
logger.setLevel(logging.INFO)

# File to store generated credentials
REPORT_FILE = "simulation_report.json"

# Food categories and menu templates
MENU_TEMPLATE = {
    "Starters": [
        {"name": "Veg Spring Rolls", "price": 120, "type": "veg", "desc": "Crispy spring rolls stuffed with spiced vegetables."},
        {"name": "Paneer Tikka", "price": 220, "type": "veg", "desc": "Grilled cottage cheese cubes in yogurt marinade."},
        {"name": "Chicken Tikka", "price": 260, "type": "non-veg", "desc": "Spicy tandoori-grilled boneless chicken."},
        {"name": "French Fries", "price": 90, "type": "veg", "desc": "Classic salted crispy potato fries."},
        {"name": "Crispy Corn", "price": 140, "type": "veg", "desc": "Golden fried corn kernels with garlic and onions."}
    ],
    "Mains": [
        {"name": "Paneer Butter Masala", "price": 280, "type": "veg", "desc": "Rich, creamy cottage cheese curry in tomato gravy."},
        {"name": "Butter Chicken", "price": 340, "type": "non-veg", "desc": "Tender chicken in a velvety spiced butter sauce."},
        {"name": "Dal Makhani", "price": 210, "type": "veg", "desc": "Slow-cooked black lentils with cream and spices."},
        {"name": "Chicken Biryani", "price": 320, "type": "non-veg", "desc": "Aromatic basmati rice cooked with chicken and spices."},
        {"name": "Veg Kadhai", "price": 230, "type": "veg", "desc": "Fresh seasonal vegetables cooked in a spicy kadhai gravy."}
    ],
    "Breads & Rice": [
        {"name": "Butter Naan", "price": 50, "type": "veg", "desc": "Soft, leavened clay-oven flatbread with butter."},
        {"name": "Garlic Naan", "price": 60, "type": "veg", "desc": "Tandoori naan topped with minced garlic and herbs."},
        {"name": "Tandoori Roti", "price": 25, "type": "veg", "desc": "Whole wheat flatbread baked in a tandoor clay oven."},
        {"name": "Jeera Rice", "price": 110, "type": "veg", "desc": "Basmati rice tempered with cumin seeds."},
        {"name": "Steamed Rice", "price": 90, "type": "veg", "desc": "Simple, fluffy steamed basmati rice."}
    ],
    "Desserts": [
        {"name": "Gulab Jamun", "price": 75, "type": "veg", "desc": "Golden brown milk balls soaked in sweet sugar syrup."},
        {"name": "Hot Chocolate Fudge", "price": 160, "type": "veg", "desc": "Vanilla ice cream topped with rich chocolate fudge and nuts."},
        {"name": "Kesar Pista Kulfi", "price": 90, "type": "veg", "desc": "Traditional Indian dense pistachio and saffron ice cream."}
    ],
    "Beverages": [
        {"name": "Fresh Lime Soda", "price": 70, "type": "veg", "desc": "Refreshing soda with squeezed lime, salt, or sugar."},
        {"name": "Masala Chai", "price": 35, "type": "veg", "desc": "Aromatic spiced tea brewed with milk and ginger."},
        {"name": "Mineral Water", "price": 30, "type": "veg", "desc": "Packaged clean drinking water."}
    ]
}

# Unsplash image placeholders for menu items
IMAGES = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=500",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500",
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=500"
]

CUSTOMER_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Anjali", "Akash", "Vikram", "Kabir", "Pooja", "Deepak", "Neha", "John", "Sarah", "Emily", "David"]

class RestaurantSimulator:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
        self.anon_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

        if not self.url or not self.anon_key:
            raise RuntimeError("Missing Supabase env vars: SUPABASE_URL and SUPABASE_ANON_KEY")
        
        self.is_running = False
        self.is_paused = False
        self.speed = 1.0  # Speed multiplier. Delays are divided by this.
        
        self.restaurants = []  # List of dicts with generated restaurant & admin info
        self.logs = []         # Live list of log entries
        self.errors = []       # Any execution errors
        
        self.metrics = {
            "total_orders": 0,
            "total_sales": 0.0,
            "active_orders": 0,
            "completed_orders": 0,
            "onboarded_restaurants": 0
        }
        
        self.task = None
        self._load_report()

    def add_log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.logs.append(log_entry)
        if len(self.logs) > 500:
            self.logs.pop(0)
        logger.info(log_entry)

    def add_error(self, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        err_entry = f"[{timestamp}] {message}"
        self.errors.append(err_entry)
        self.add_log(message, "ERROR")

    def _load_report(self):
        if os.path.exists(REPORT_FILE):
            try:
                with open(REPORT_FILE, "r") as f:
                    data = json.load(f)
                    self.restaurants = data.get("restaurants", [])
                    self.metrics["onboarded_restaurants"] = len(self.restaurants)
                    self.add_log(f"Loaded {len(self.restaurants)} restaurant credentials from report.")
            except Exception as e:
                self.add_error(f"Failed to load simulation report: {e}")

    def _save_report(self):
        try:
            with open(REPORT_FILE, "w") as f:
                json.dump({
                    "restaurants": self.restaurants,
                    "generated_at": datetime.now().isoformat(),
                    "total_count": len(self.restaurants)
                }, f, indent=2)
            self.add_log("Saved restaurant credentials report.")
        except Exception as e:
            self.add_error(f"Failed to save simulation report: {e}")

    def get_client(self, access_token: str = None) -> Client:
        client = create_client(self.url, self.anon_key)
        if access_token:
            client.options.headers.update({"Authorization": f"Bearer {access_token}"})
        return client

    async def start(self, super_email: str, super_pass: str, num_restaurants: int = 10, speed: float = 1.0):
        if self.is_running:
            self.is_paused = False
            self.speed = speed
            self.add_log(f"Simulation resumed. Speed: {speed}x")
            return
        
        self.is_running = True
        self.is_paused = False
        self.speed = speed
        self.add_log(f"Starting simulation bot. Speed: {speed}x, Target Restaurants: {num_restaurants}")
        
        self.task = asyncio.create_task(self._run_loop(super_email, super_pass, num_restaurants))

    async def pause(self):
        if self.is_running:
            self.is_paused = True
            self.add_log("Simulation paused.")

    async def stop(self):
        self.is_running = False
        self.is_paused = False
        if self.task:
            self.task.cancel()
            self.task = None
        self.add_log("Simulation stopped.")

    async def clear_data(self, super_email: str, super_pass: str) -> bool:
        self.add_log("Clearing all generated simulation data...")
        try:
            # Sign in as Super Admin
            client = self.get_client()
            res = client.auth.sign_in_with_password({"email": super_email, "password": super_pass})
            access_token = res.session.access_token
            client.options.headers.update({"Authorization": f"Bearer {access_token}"})
            
            # Fetch restaurants starting with BotRest
            rest_res = client.table("restaurants").select("id, name").ilike("name", "BotRest - %").execute()
            restaurants_to_delete = rest_res.data
            self.add_log(f"Found {len(restaurants_to_delete)} bot restaurants to delete.")
            
            for r in restaurants_to_delete:
                # Deleting restaurant cascades to tables, menus, users, invoices, and orders in public schema
                self.add_log(f"Deleting restaurant {r['name']} ({r['id']})...")
                client.table("restaurants").delete().eq("id", r["id"]).execute()
                
            self.restaurants = []
            if os.path.exists(REPORT_FILE):
                os.remove(REPORT_FILE)
                
            self.metrics = {
                "total_orders": 0,
                "total_sales": 0.0,
                "active_orders": 0,
                "completed_orders": 0,
                "onboarded_restaurants": 0
            }
            self.add_log("Simulation database cleared successfully.")
            return True
        except Exception as e:
            self.add_error(f"Error clearing simulation data: {e}")
            return False

    async def _run_loop(self, super_email: str, super_pass: str, target_count: int):
        try:
            # Step 1: Login as Super Admin
            self.add_log("Step 1: Authenticating Super Admin credentials...")
            client = self.get_client()
            super_auth = client.auth.sign_in_with_password({"email": super_email, "password": super_pass})
            super_token = super_auth.session.access_token
            self.add_log("Super Admin authenticated successfully.")
            
            # Step 2: Onboard restaurants if needed
            client = self.get_client(super_token)
            
            # Check existing restaurants to avoid recreating
            existing_res = client.table("restaurants").select("*").ilike("name", "BotRest - %").execute()
            existing_count = len(existing_res.data)
            self.add_log(f"Found {existing_count} existing bot restaurants in database.")
            
            if existing_count < target_count:
                needed = target_count - existing_count
                self.add_log(f"Need to onboard {needed} new restaurants.")
                for i in range(needed):
                    await self._onboard_restaurant(client, super_token, existing_count + i + 1)
                    await asyncio.sleep(1.0)
            else:
                self.add_log("Target restaurant count met. Proceeding to simulation.")
                # Restore them to our local credentials list if empty
                if not self.restaurants:
                    for r in existing_res.data:
                        # Find admin email
                        users_res = client.table("users").select("full_name").eq("restaurant_id", r["id"]).eq("role", "admin").execute()
                        admin_email = users_res.data[0]["full_name"] if users_res.data else f"admin-{r['slug']}@test.com"
                        
                        # Fetch initial stats
                        try:
                            tb_c = client.table("tables").select("id", count="exact").eq("restaurant_id", r["id"]).execute()
                            tables_count = tb_c.count if tb_c.count else 0
                            
                            mi_c = client.table("menu_items").select("id", count="exact").eq("restaurant_id", r["id"]).execute()
                            menu_items_count = mi_c.count if mi_c.count else 0
                            
                            ord_c = client.table("orders").select("id", count="exact").eq("restaurant_id", r["id"]).execute()
                            orders_count = ord_c.count if ord_c.count else 0
                            
                            comp_c = client.table("orders").select("id", count="exact").eq("restaurant_id", r["id"]).eq("status", "COMPLETED").execute()
                            completed_count = comp_c.count if comp_c.count else 0
                            
                            inv_res = client.table("invoices").select("total_amount").eq("restaurant_id", r["id"]).execute()
                            sales_amount = sum([float(i["total_amount"]) for i in inv_res.data]) if inv_res.data else 0.0
                        except Exception as fetch_err:
                            tables_count = 0
                            menu_items_count = 0
                            orders_count = 0
                            completed_count = 0
                            sales_amount = 0.0

                        self.restaurants.append({
                            "restaurant_id": r["id"],
                            "name": r["name"],
                            "slug": r["slug"],
                            "email": admin_email,
                            "password": "password123", # default generated password
                            "address": r.get("address", "123 Bot St"),
                            "phone": r.get("phone", "+91 9999900000"),
                            "orders_count": orders_count,
                            "completed_count": completed_count,
                            "sales_amount": sales_amount,
                            "tables_count": tables_count,
                            "menu_items_count": menu_items_count
                        })
                    self._save_report()
            
            # Update metrics
            self.metrics["onboarded_restaurants"] = len(self.restaurants)
            
            # Step 3: Run the order lifecycle simulation
            self.add_log("Step 3: Beginning human-like order and workflow simulation...")
            
            while self.is_running:
                if self.is_paused:
                    await asyncio.sleep(1.0)
                    continue
                
                # Pick a random restaurant to act on
                r_info = random.choice(self.restaurants)
                restaurant_id = r_info["restaurant_id"]
                
                # Authenticate as this restaurant admin to insert/modify scoped data
                self.add_log(f"Simulating activity for restaurant: {r_info['name']}")
                rest_client = self.get_client()
                try:
                    rest_auth = rest_client.auth.sign_in_with_password({"email": r_info["email"], "password": r_info["password"]})
                    rest_client.options.headers.update({"Authorization": f"Bearer {rest_auth.session.access_token}"})
                except Exception as auth_err:
                    self.add_error(f"Failed to authenticate as restaurant admin {r_info['email']}: {auth_err}")
                    await asyncio.sleep(3.0)
                    continue
                
                # Check tables and menus for this restaurant
                tables = await self._get_or_create_tables(rest_client, restaurant_id)
                menu_items = await self._get_or_create_menu(rest_client, restaurant_id)
                
                if not tables or not menu_items:
                    self.add_error(f"Cannot simulate for {r_info['name']} due to missing menus/tables.")
                    await asyncio.sleep(2.0)
                    continue
                
                # Decide action: Place a new order or update/finalize an active order
                # Let's get active orders for this restaurant
                active_orders_res = rest_client.table("orders").select("id, status, table_id, total_amount")\
                    .eq("restaurant_id", restaurant_id)\
                    .neq("status", "COMPLETED").neq("status", "CANCELLED").execute()
                active_orders = active_orders_res.data
                self.metrics["active_orders"] = len(active_orders)
                
                action = "place_order"
                if len(active_orders) >= 10:
                    action = "update_order"
                elif active_orders and random.random() < 0.6:
                    action = "update_order"
                
                if action == "place_order":
                    # Place a new order
                    await self._simulate_place_order(rest_client, restaurant_id, tables, menu_items, r_info["name"])
                else:
                    # Update a random active order's lifecycle
                    order = random.choice(active_orders)
                    await self._simulate_order_lifecycle(rest_client, order, restaurant_id, r_info["name"])
                
                # Dynamic delay based on speed multiplier (default delay 10-20 seconds / speed)
                base_delay = random.uniform(5.0, 15.0)
                actual_delay = max(0.5, base_delay / self.speed)
                await asyncio.sleep(actual_delay)
                
        except asyncio.CancelledError:
            self.add_log("Simulation background task was cancelled.")
        except Exception as loop_err:
            self.add_error(f"Fatal error in simulation loop: {loop_err}")
            self.is_running = False

    async def _onboard_restaurant(self, super_client: Client, super_token: str, index: int):
        rest_name = f"BotRest - {random.choice(['Gourmet', 'Spicy', 'Tasty', 'Royal', 'Organic', 'Crunchy'])} {random.choice(['Bistro', 'Palace', 'Kitchen', 'Hub', 'Diner', 'Plaza'])} {index}"
        slug = f"botrest-shop-{index}-{int(random.random()*1000)}"
        email = f"botadmin-restaurant-{index}@gmail.com"
        password = "password123"
        address = f"{random.randint(10, 999)} {random.choice(['MG Road', 'Bandra West', 'Indiranagar', 'Park Street'])}, Food City"
        phone = f"+91 99999{index:05d}"
        
        self.add_log(f"Provisioning restaurant: '{rest_name}'...")
        
        # 1. Insert restaurant
        rest_res = super_client.table("restaurants").insert({
            "name": rest_name,
            "slug": slug,
            "address": address,
            "phone": phone,
            "is_active": True
        }).execute()
        
        restaurant_id = rest_res.data[0]["id"]
        
        # 2. Invoke Edge Function to create owner user
        func_url = f"{self.url}/functions/v1/manage-users"
        headers = {
            "Authorization": f"Bearer {super_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "email": email,
            "password": password,
            "fullName": f"BotOwner {index}",
            "phone": phone,
            "role": "RESTAURANT_ADMIN",
            "restaurantId": restaurant_id
        }
        
        response = requests.post(func_url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to create admin via edge function: {response.text}")
            
        res_json = response.json()
        admin_id = res_json.get("userId")
        
        # Store in credentials list
        self.restaurants.append({
            "restaurant_id": restaurant_id,
            "admin_id": admin_id,
            "name": rest_name,
            "slug": slug,
            "email": email,
            "password": password,
            "phone": phone,
            "address": address,
            "orders_count": 0,
            "completed_count": 0,
            "sales_amount": 0.0,
            "tables_count": 0,
            "menu_items_count": 0
        })
        self._save_report()
        self.add_log(f"Successfully onboarded '{rest_name}'. Admin: {email}")

    async def _get_or_create_tables(self, client: Client, restaurant_id: str) -> List[Dict[str, Any]]:
        res = client.table("tables").select("*").eq("restaurant_id", restaurant_id).execute()
        if len(res.data) > 0:
            return res.data
            
        # Seed 10-15 tables
        self.add_log(f"Seeding tables for restaurant {restaurant_id}...")
        tables_to_insert = []
        num_tables = random.randint(10, 15)
        for i in range(1, num_tables + 1):
            tables_to_insert.append({
                "restaurant_id": restaurant_id,
                "table_number": str(i),
                "table_name": f"T-{i}",
                "capacity": random.choice([2, 4, 6, 8]),
                "status": "available"
            })
            
        ins_res = client.table("tables").insert(tables_to_insert).execute()
        # Update tables count locally
        for r in self.restaurants:
            if r["restaurant_id"] == restaurant_id:
                r["tables_count"] = len(ins_res.data)
                break
        return ins_res.data

    async def _get_or_create_menu(self, client: Client, restaurant_id: str) -> List[Dict[str, Any]]:
        # Check categories
        cat_res = client.table("menu_categories").select("*").eq("restaurant_id", restaurant_id).execute()
        categories = cat_res.data
        
        if len(categories) == 0:
            self.add_log(f"Seeding categories & menus for restaurant {restaurant_id}...")
            categories = []
            for idx, (cat_name, items) in enumerate(MENU_TEMPLATE.items()):
                res = client.table("menu_categories").insert({
                    "restaurant_id": restaurant_id,
                    "name": cat_name,
                    "sort_order": idx
                }).execute()
                category = res.data[0]
                categories.append(category)
                
                # Insert items for this category (randomly select 4-5 items per category)
                items_to_insert = []
                for item in items:
                    items_to_insert.append({
                        "restaurant_id": restaurant_id,
                        "category_id": category["id"],
                        "name": item["name"],
                        "description": item["desc"],
                        "price": float(item["price"] * random.uniform(0.9, 1.1)),  # Randomize price slightly
                        "image_url": random.choice(IMAGES),
                        "is_available": True,
                        "type": item["type"]
                    })
                client.table("menu_items").insert(items_to_insert).execute()
                
        # Fetch items
        items_res = client.table("menu_items").select("*").eq("restaurant_id", restaurant_id).execute()
        # Update menu items count locally
        for r in self.restaurants:
            if r["restaurant_id"] == restaurant_id:
                r["menu_items_count"] = len(items_res.data)
                break
        return items_res.data

    async def _simulate_place_order(self, client: Client, restaurant_id: str, tables: List[Dict[str, Any]], menu_items: List[Dict[str, Any]], rest_name: str):
        # Pick an available table
        available_tables = [t for t in tables if t["status"] == "available"]
        if not available_tables:
            # Free up one table to simulate checkout manually if all are occupied
            occupied = [t for t in tables if t["status"] == "occupied"]
            if occupied:
                t = random.choice(occupied)
                client.table("tables").update({"status": "available", "current_order_id": None}).eq("id", t["id"]).execute()
                self.add_log(f"Forced release of occupied table {t['table_name']} to simulate new customer.")
                available_tables = [t]
            else:
                return
                
        table = random.choice(available_tables)
        
        # Generate customer details
        cust_name = random.choice(CUSTOMER_NAMES)
        cust_phone = f"+91 99999{random.randint(10000, 99999)}"
        
        # Select random food items (2 to 4 items)
        selected_items = random.sample(menu_items, k=random.randint(2, 4))
        
        order_items_payload = []
        grand_total = 0.0
        
        for item in selected_items:
            qty = random.randint(1, 3)
            price = float(item["price"])
            total = price * qty
            grand_total += total
            order_items_payload.append({
                "menu_item_id": item["id"],
                "quantity": qty,
                "unit_price": price,
                "total_price": total,
                "notes": random.choice(["", "No spicy", "Extra cheese", "Serve hot"]),
                "status": "PENDING"
            })
            
        # Add 5% GST tax
        tax = round(grand_total * 0.05, 2)
        grand_total_with_tax = grand_total + tax
        
        # Create order in Supabase
        order_res = client.table("orders").insert({
            "restaurant_id": restaurant_id,
            "table_id": table["id"],
            "status": "PENDING",
            "approval_status": "APPROVED",
            "total_amount": grand_total_with_tax,
            "customer_phone": cust_phone,
            "notes": f"[BOT] Customer: {cust_name}"
        }).execute()
        
        order_id = order_res.data[0]["id"]
        
        # Create order items
        for item in order_items_payload:
            item["order_id"] = order_id
        client.table("order_items").insert(order_items_payload).execute()
        
        # Mark table occupied
        client.table("tables").update({"status": "occupied", "current_order_id": order_id}).eq("id", table["id"]).execute()
        
        self.metrics["total_orders"] += 1
        for r in self.restaurants:
            if r["restaurant_id"] == restaurant_id:
                r["orders_count"] = r.get("orders_count", 0) + 1
                if r.get("tables_count", 0) == 0:
                    r["tables_count"] = len(tables)
                if r.get("menu_items_count", 0) == 0:
                    r["menu_items_count"] = len(menu_items)
                break
        self.add_log(f"[{rest_name}] Table {table['table_name']} - Created PENDING Order #{order_id[:4].upper()} for {cust_name} (₹{grand_total_with_tax:.2f})")

    async def _simulate_order_lifecycle(self, client: Client, order: Dict[str, Any], restaurant_id: str, rest_name: str):
        order_id = order["id"]
        current_status = order["status"]
        
        next_status_map = {
            "PENDING": "PREPARING",
            "PREPARING": "READY",
            "READY": "SERVED",
            "SERVED": "COMPLETED"
        }
        
        next_status = next_status_map.get(current_status)
        if not next_status:
            return
            
        if next_status == "COMPLETED":
            # Generate invoice & checkout
            subtotal = float(order["total_amount"]) / 1.05
            tax = round(subtotal * 0.05, 2)
            discount = 0.0
            total = float(order["total_amount"])
            
            year = datetime.now().year
            month = f"{datetime.now().month:02d}"
            rand_inv = random.randint(1000, 9999)
            invoice_num = f"BOT-INV-{year}{month}-{rand_inv}"
            payment_mode = random.choice(["CASH", "CARD", "UPI"])
            
            # Insert invoice
            client.table("invoices").insert({
                "restaurant_id": restaurant_id,
                "order_id": order_id,
                "invoice_number": invoice_num,
                "subtotal": subtotal,
                "tax_amount": tax,
                "discount_amount": discount,
                "total_amount": total,
                "payment_method": payment_mode,
                "payment_status": "completed"
            }).execute()
            
            # Update order
            client.table("orders").update({"status": "COMPLETED"}).eq("id", order_id).execute()
            
            # Update order items status
            client.table("order_items").update({"status": "SERVED"}).eq("order_id", order_id).execute()
            
            # Clear table
            if order.get("table_id"):
                client.table("tables").update({"status": "available", "current_order_id": None}).eq("id", order["table_id"]).execute()
                
            self.metrics["total_sales"] += total
            self.metrics["completed_orders"] += 1
            for r in self.restaurants:
                if r["restaurant_id"] == restaurant_id:
                    r["sales_amount"] = r.get("sales_amount", 0.0) + total
                    r["completed_count"] = r.get("completed_count", 0) + 1
                    break
            self.add_log(f"[{rest_name}] Order #{order_id[:4].upper()} completed & paid via {payment_mode}. Generated Invoice {invoice_num}.")
        else:
            # Simply update order status and order items status
            client.table("orders").update({"status": next_status}).eq("id", order_id).execute()
            
            # Update order items status if cooking states
            item_status = "PENDING"
            if next_status == "PREPARING":
                item_status = "PREPARING"
            elif next_status in ["READY", "SERVED"]:
                item_status = "READY" if next_status == "READY" else "SERVED"
                
            client.table("order_items").update({"status": item_status}).eq("order_id", order_id).execute()
            self.add_log(f"[{rest_name}] Order #{order_id[:4].upper()} advanced to {next_status}.")
