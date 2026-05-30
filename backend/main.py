import os
import asyncio
import secrets
import io
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header
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

load_dotenv(dotenv_path="../.env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("VITE_SUPABASE_URL").strip()
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY").strip()
supabase: Client = create_client(url, key)

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
    client = get_authenticated_client(authorization)
    
    # Check role
    user_res = client.auth.get_user()
    if not user_res or not user_res.user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    db_user = client.table("users").select("role").eq("id", user_res.user.id).single().execute()
    if not db_user.data or db_user.data.get("role") not in ["RESTAURANT_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can regenerate table QR tokens.")
        
    token = f"t_{secrets.token_hex(4)}"
    res = client.table("tables").update({"qr_token": token}).eq("id", table_id).execute()
    if not res.data:
         raise HTTPException(status_code=404, detail="Table not found.")
    return {"success": True, "qr_token": token, "table": res.data[0]}

@app.get("/order/{table_token}")
def handle_qr_scan(table_token: str):
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
    
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").strip()
    return RedirectResponse(url=f"{frontend_url}/menu?session_id={session_id}")

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
def get_qr_image(table_id: str):
    table_res = supabase.table("tables").select("qr_token").eq("id", table_id).execute()
    if not table_res.data or len(table_res.data) == 0 or not table_res.data[0].get("qr_token"):
        raise HTTPException(status_code=404, detail="QR Code not generated for this table yet.")
        
    token = table_res.data[0]["qr_token"]
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000").strip()
    qr_url = f"{backend_url}/order/{token}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")

@app.get("/api/tables/{table_id}/qr-code-pdf")
def get_qr_pdf(table_id: str):
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
    
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000").strip()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
