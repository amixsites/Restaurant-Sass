import os
import asyncio
import secrets
import io
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
from analytics import calculate_analytics
from bot import RestaurantSimulator
import qrcode
from reportlab.lib.pagesizes import A6
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))


def get_env_var(name: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    value = os.environ.get(name, default)
    if isinstance(value, str):
        value = value.strip()
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

frontend_url = get_env_var("FRONTEND_URL", default="http://localhost:5173")
frontend_origins = [origin.strip() for origin in frontend_url.split(",") if origin.strip()]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = get_env_var("VITE_SUPABASE_URL", required=True)
key: str = get_env_var("VITE_SUPABASE_ANON_KEY", required=True)
secret_key: Optional[str] = get_env_var("SECRET_KEY")

if os.environ.get("ENV", "").lower() == "production" and not secret_key:
    raise RuntimeError("SECRET_KEY is required in production. Set SECRET_KEY in your environment.")

supabase: Client = create_client(url, key)

def get_qr_base_url(request: Request | None = None) -> str:
    """Return the base URL for QR code links (the backend's public URL).
    Priority: QR_BASE_URL env var → BACKEND_URL env var → request.base_url → localhost fallback."""
    env_url = get_env_var("QR_BASE_URL") or get_env_var("BACKEND_URL")
    if env_url:
        return env_url.rstrip("/")
    if request is not None:
        # Use the actual request base_url (handles reverse-proxy X-Forwarded headers)
        return str(request.base_url).rstrip("/")
    return "http://localhost:8000"

def get_authenticated_client(token: Optional[str] = None) -> Client:
    client = create_client(url, key)
    if token:
        clean_token = token.replace("Bearer ", "").strip()
        client.options.headers.update({"Authorization": f"Bearer {clean_token}"})
    return client

# Global simulator instance
simulator = RestaurantSimulator()

class StartSimulationRequest(BaseModel):
    email: str
    password: str
    num_restaurants: int = 10
    speed: float = 1.0

class ClearSimulationRequest(BaseModel):
    email: str
    password: str

class OrderItemInput(BaseModel):
    menu_item_id: str
    quantity: int
    notes: Optional[str] = ""

class PlaceOrderRequest(BaseModel):
    session_id: str
    customer_name: str
    customer_phone: str
    items: List[OrderItemInput]

@app.get("/api/analytics/{restaurant_id}")
def get_analytics(restaurant_id: str, range: str = "Weekly", authorization: Optional[str] = Header(None)):
    client = get_authenticated_client(authorization)
    return calculate_analytics(client, restaurant_id, range)

@app.websocket("/api/analytics/{restaurant_id}/live")
async def websocket_endpoint(websocket: WebSocket, restaurant_id: str, range: str = "Weekly", token: Optional[str] = None):
    await websocket.accept()
    client = get_authenticated_client(token)
    try:
        while True:
            data = calculate_analytics(client, restaurant_id, range)
            await websocket.send_json(data)
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        print(f"Client disconnected from analytics stream for restaurant: {restaurant_id}")

# --- Simulation Endpoints ---

@app.post("/api/simulation/start")
async def start_simulation(req: StartSimulationRequest):
    try:
        await simulator.start(
            super_email=req.email, 
            super_pass=req.password, 
            num_restaurants=req.num_restaurants, 
            speed=req.speed
        )
        return {"success": True, "message": "Simulation bot started successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulation/pause")
async def pause_simulation():
    await simulator.pause()
    return {"success": True, "message": "Simulation bot paused."}

@app.post("/api/simulation/stop")
async def stop_simulation():
    await simulator.stop()
    return {"success": True, "message": "Simulation bot stopped."}

@app.post("/api/simulation/clear")
async def clear_simulation(req: ClearSimulationRequest):
    success = await simulator.clear_data(req.email, req.password)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to clear simulation data. Check credentials and logs.")
    return {"success": True, "message": "Simulation database cleared successfully."}

@app.get("/api/simulation/status")
def get_simulation_status():
    return {
        "is_running": simulator.is_running,
        "is_paused": simulator.is_paused,
        "speed": simulator.speed,
        "metrics": simulator.metrics,
        "restaurants": simulator.restaurants,
        "logs": list(reversed(simulator.logs))[:100],  # Return recent 100 logs (newest first)
        "errors": list(reversed(simulator.errors))[:50]
    }

# --- Secure Table QR Code & Seating Session Endpoints ---

def generate_pdf_buffer(restaurant_name: str, table_number: str, qr_url: str) -> io.BytesIO:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A6)
    width, height = A6
    
    # Border
    c.setStrokeColor(colors.HexColor("#f97316"))
    c.setLineWidth(3)
    c.rect(10, 10, width - 20, height - 20)
    
    # Title
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawCentredString(width / 2.0, height - 40, restaurant_name)
    
    # Table Number
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.HexColor("#f97316"))
    c.drawCentredString(width / 2.0, height - 75, f"TABLE {table_number}")
    
    # QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    
    qr_width = 160
    qr_height = 160
    qr_x = (width - qr_width) / 2.0
    qr_y = (height - qr_height) / 2.0 - 15
    c.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_width, height=qr_height)
    
    # Info card at bottom
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.roundRect(25, 25, width - 50, 45, 8, fill=True, stroke=True)
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(width / 2.0, 50, "Scan to View Menu & Order")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(width / 2.0, 35, "Powered by DineSwift digital ordering")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer

@app.post("/api/tables/{table_id}/generate-qr")
def generate_qr(table_id: str, authorization: Optional[str] = Header(None)):
    client = get_authenticated_client(authorization)
    
    # Check if QR token already exists
    table_res = client.table("tables").select("qr_token").eq("id", table_id).single().execute()
    if table_res.data and table_res.data.get("qr_token"):
         raise HTTPException(status_code=400, detail="QR Code already generated for this table. Use regenerate instead.")
         
    token = f"t_{secrets.token_hex(4)}"
    res = client.table("tables").update({"qr_token": token}).eq("id", table_id).execute()
    if not res.data:
         raise HTTPException(status_code=404, detail="Table not found or unauthorized.")
    return {"success": True, "qr_token": token, "table": res.data[0]}

@app.post("/api/tables/{table_id}/regenerate-qr")
def regenerate_qr(table_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")
    
    client = get_authenticated_client(authorization)
    
    # Verify user is authenticated
    try:
        user_res = client.auth.get_user()
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Unauthorized: invalid token.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth check failed: {str(e)}")
    
    # Verify role
    try:
        db_user = client.table("users").select("role").eq("id", user_res.user.id).single().execute()
        if not db_user.data or db_user.data.get("role") not in ["RESTAURANT_ADMIN", "SUPER_ADMIN"]:
            raise HTTPException(status_code=403, detail="Only admins can regenerate table QR tokens.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify role: {str(e)}")
        
    token = f"t_{secrets.token_hex(4)}"
    try:
        res = client.table("tables").update({"qr_token": token}).eq("id", table_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Table not found or you don't have permission to update it.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update QR token: {str(e)}")
    
    return {"success": True, "qr_token": token, "table": res.data[0]}

@app.get("/order/{table_token}")
def handle_qr_scan(table_token: str, request: Request):
    table_res = supabase.table("tables").select("id, restaurant_id").eq("qr_token", table_token).execute()
    if not table_res.data:
        raise HTTPException(status_code=404, detail="Invalid table token. This QR code is no longer active.")
        
    table = table_res.data[0]
    restaurant_id = table["restaurant_id"]
    table_id = table["id"]
    
    session_id = f"sess_{secrets.token_urlsafe(16)}"
    
    supabase.table("customer_sessions").insert({
        "session_id": session_id,
        "restaurant_id": restaurant_id,
        "table_id": table_id
    }).execute()
    
    # Use FRONTEND_URL env var. For local dev, fall back to localhost:5173 only
    # if the env var is not configured or still has placeholder value.
    configured_frontend = frontend_url
    is_placeholder = not configured_frontend or "your-vercel" in configured_frontend
    host = request.headers.get("host", "")
    if is_placeholder and ("localhost" in host or "127.0.0.1" in host):
        current_frontend_url = "http://localhost:5173"
    else:
        # Use the first configured URL (supports comma-separated for CORS)
        current_frontend_url = frontend_origins[0] if frontend_origins else configured_frontend
        
    return RedirectResponse(url=f"{current_frontend_url}/menu?session_id={session_id}")

@app.get("/api/session/{session_id}")
def get_session_details(session_id: str):
    session_res = supabase.table("customer_sessions").select("restaurant_id, table_id").eq("session_id", session_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Invalid session. Please scan the table QR code again.")
        
    sess = session_res.data[0]
    
    restaurant_name = "Restaurant"
    try:
        rest_res = supabase.table("restaurants").select("name").eq("id", sess["restaurant_id"]).execute()
        if rest_res.data and len(rest_res.data) > 0:
            restaurant_name = rest_res.data[0].get("name", "Restaurant")
    except Exception as e:
        print(f"Error fetching restaurant details: {e}")
        
    table_number = "N/A"
    try:
        table_res = supabase.table("tables").select("table_number").eq("id", sess["table_id"]).execute()
        if table_res.data and len(table_res.data) > 0:
            table_number = table_res.data[0].get("table_number", "N/A")
    except Exception as e:
        print(f"Error fetching table details: {e}")
    
    return {
        "session_id": session_id,
        "restaurant_id": sess["restaurant_id"],
        "table_id": sess["table_id"],
        "restaurant_name": restaurant_name,
        "table_number": table_number
    }

@app.get("/api/tables/{table_id}/qr-code-image")
def get_qr_image(table_id: str, request: Request):
    table_res = supabase.table("tables").select("qr_token").eq("id", table_id).execute()
    if not table_res.data or len(table_res.data) == 0 or not table_res.data[0].get("qr_token"):
        raise HTTPException(status_code=404, detail="QR Code not generated for this table yet.")
        
    token = table_res.data[0]["qr_token"]
    # Use configured QR_BASE_URL (public backend URL) so QR codes encode the real URL
    backend_url = get_qr_base_url(request)
    qr_url = f"{backend_url}/order/{token}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={"Content-Disposition": "inline; filename=qr.png", "Cache-Control": "no-cache"}
    )

@app.get("/api/tables/{table_id}/qr-code-pdf")
def get_qr_pdf(table_id: str, request: Request):
    table_res = supabase.table("tables").select("table_number, restaurant_id, qr_token").eq("id", table_id).execute()
    if not table_res.data or len(table_res.data) == 0 or not table_res.data[0].get("qr_token"):
        raise HTTPException(status_code=404, detail="QR Code not generated for this table yet.")
        
    table_data = table_res.data[0]
    token = table_data["qr_token"]
    table_num = table_data["table_number"]
    rest_id = table_data["restaurant_id"]
    
    rest_name = "Restaurant"
    try:
        rest_res = supabase.table("restaurants").select("name").eq("id", rest_id).execute()
        if rest_res.data and len(rest_res.data) > 0:
            rest_name = rest_res.data[0].get("name", "Restaurant")
    except Exception as e:
        print(f"Error fetching restaurant name for PDF: {e}")
    
    # Use configured QR_BASE_URL so PDF QR codes encode the real public URL
    backend_url = get_qr_base_url(request)
    qr_url = f"{backend_url}/order/{token}"
    pdf_buffer = generate_pdf_buffer(rest_name, table_num, qr_url)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=table_{table_num}_qr.pdf"}
    )

@app.post("/api/orders/place")
def place_customer_order(req: PlaceOrderRequest):
    session_res = supabase.table("customer_sessions").select("restaurant_id, table_id").eq("session_id", req.session_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=400, detail="Invalid session. Please scan table QR code again.")
        
    sess = session_res.data[0]
    restaurant_id = sess["restaurant_id"]
    table_id = sess["table_id"]
    
    menu_item_ids = [item.menu_item_id for item in req.items]
    menu_res = supabase.table("menu_items").select("id, price").in_("id", menu_item_ids).execute()
    
    if not menu_res.data:
        raise HTTPException(status_code=400, detail="Failed to fetch menu items for pricing.")
        
    price_map = {item["id"]: float(item["price"]) for item in menu_res.data}
    
    subtotal = 0.0
    for item in req.items:
        if item.menu_item_id not in price_map:
            raise HTTPException(status_code=400, detail=f"Menu item {item.menu_item_id} not found.")
        subtotal += price_map[item.menu_item_id] * item.quantity
        
    tax_amount = round(subtotal * 0.05)
    grand_total = subtotal + tax_amount
    
    order_payload = {
        "restaurant_id": restaurant_id,
        "table_id": table_id,
        "status": "PENDING",
        "approval_status": "PENDING_APPROVAL",
        "total_amount": grand_total,
        "customer_phone": req.customer_phone or None,
        "notes": f"Customer: {req.customer_name}"
    }
    
    order_res = supabase.table("orders").insert([order_payload]).execute()
    if not order_res.data:
        raise HTTPException(status_code=500, detail="Failed to create order.")
        
    order = order_res.data[0]
    order_id = order["id"]
    
    order_items_payload = []
    for item in req.items:
        unit_price = price_map[item.menu_item_id]
        order_items_payload.append({
            "order_id": order_id,
            "menu_item_id": item.menu_item_id,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "total_price": unit_price * item.quantity,
            "notes": item.notes or "",
            "status": "PENDING"
        })
        
    items_res = supabase.table("order_items").insert(order_items_payload).execute()
    if not items_res.data:
        supabase.table("orders").delete().eq("id", order_id).execute()
        raise HTTPException(status_code=500, detail="Failed to create order items.")
        
    supabase.table("tables").update({"status": "occupied"}).eq("id", table_id).execute()
    
    return {"success": True, "order": order, "items": items_res.data}

# --- Super Admin Impersonation Endpoints ---

class EndImpersonateRequest(BaseModel):
    restaurant_id: str
    restaurant_name: str

def verify_super_admin(client: Client):
    """Verify the authenticated user has SUPER_ADMIN role. Returns user data or raises 403."""
    user_res = client.auth.get_user()
    if not user_res or not user_res.user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    db_user = client.table("users").select("role, email, full_name").eq("id", user_res.user.id).single().execute()
    if not db_user.data or db_user.data.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Super Admins can perform this action.")
    
    return {
        "id": user_res.user.id,
        "email": db_user.data.get("email", user_res.user.email or ""),
        "full_name": db_user.data.get("full_name", ""),
    }

@app.post("/api/super-admin/restaurants/{restaurant_id}/impersonate")
def impersonate_restaurant(restaurant_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Start impersonating a restaurant. Logs the action to audit_logs."""
    client = get_authenticated_client(authorization)
    admin_user = verify_super_admin(client)
    
    # Fetch restaurant details
    rest_res = client.table("restaurants").select("id, name").eq("id", restaurant_id).single().execute()
    if not rest_res.data:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    
    restaurant = rest_res.data
    
    # Create audit log entry
    client.table("audit_logs").insert({
        "super_admin_id": admin_user["id"],
        "super_admin_email": admin_user["email"],
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "action": "IMPERSONATE_START",
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", ""),
    }).execute()
    
    return {
        "success": True,
        "restaurant_id": restaurant["id"],
        "restaurant_name": restaurant["name"],
        "impersonated_at": str(os.popen("date /t").read().strip()) if os.name == "nt" else "",
    }

@app.post("/api/super-admin/impersonate/end")
def end_impersonation(req: EndImpersonateRequest, request: Request, authorization: Optional[str] = Header(None)):
    """End impersonation and log the action."""
    client = get_authenticated_client(authorization)
    admin_user = verify_super_admin(client)
    
    # Create audit log entry
    client.table("audit_logs").insert({
        "super_admin_id": admin_user["id"],
        "super_admin_email": admin_user["email"],
        "restaurant_id": req.restaurant_id,
        "restaurant_name": req.restaurant_name,
        "action": "IMPERSONATE_END",
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", ""),
    }).execute()
    
    return {"success": True, "message": "Impersonation ended."}

@app.get("/api/super-admin/audit-logs")
def get_audit_logs(
    page: int = 1,
    limit: int = 20,
    restaurant_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Fetch paginated audit logs. Only accessible by Super Admins."""
    client = get_authenticated_client(authorization)
    verify_super_admin(client)
    
    offset = (page - 1) * limit
    
    query = client.table("audit_logs").select("*", count="exact").order("created_at", desc=True)
    
    if restaurant_id:
        query = query.eq("restaurant_id", restaurant_id)
    
    query = query.range(offset, offset + limit - 1)
    res = query.execute()
    
    return {
        "logs": res.data or [],
        "total_count": res.count or 0,
        "page": page,
        "limit": limit,
        "total_pages": max(1, -(-((res.count or 0)) // limit)),  # Ceiling division
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

