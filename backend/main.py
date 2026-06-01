import os
import asyncio
import secrets
import io
import re
import uuid
import urllib.request
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
from analytics import calculate_analytics
from bot import RestaurantSimulator
import traceback

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

@app.middleware("http")
async def global_exception_handler(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("🔥 UNHANDLED ERROR:", str(e))
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": str(e)
            }
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client | None = None

def init_supabase() -> Optional[Client]:
    url = get_env_var("SUPABASE_URL") or get_env_var("VITE_SUPABASE_URL")
    key = get_env_var("SUPABASE_ANON_KEY") or get_env_var("VITE_SUPABASE_ANON_KEY")

    if not url or not key:
        print("[FATAL] Missing Supabase env vars; expected SUPABASE_URL and SUPABASE_ANON_KEY.")
        return None

    try:
        client = create_client(url, key)
        print("[OK] Supabase client initialized")
        return client
    except Exception as e:
        print("[FATAL] Supabase init failed:", str(e))
        return None

async def keep_alive_loop():
    keep_alive_url = get_env_var("KEEP_ALIVE_URL") or get_env_var("BACKEND_URL")
    if not keep_alive_url:
        print("[WARN] No KEEP_ALIVE_URL or BACKEND_URL configured, keep-alive loop disabled.")
        return

    while True:
        try:
            print(f"[KEEP_ALIVE] Pinging {keep_alive_url}")
            with urllib.request.urlopen(keep_alive_url, timeout=10) as resp:
                print(f"[KEEP_ALIVE] status={resp.status}")
        except Exception as e:
            print("[KEEP_ALIVE] ping failed:", str(e))
        await asyncio.sleep(600)

@app.on_event("startup")
async def startup_check():
    url = get_env_var("SUPABASE_URL") or get_env_var("VITE_SUPABASE_URL")
    key = get_env_var("SUPABASE_ANON_KEY") or get_env_var("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Missing Supabase env vars")

    try:
        if supabase is None:
            raise RuntimeError("Supabase client not initialized")
        supabase.table("tables").select("id").limit(1).execute()
        print("[BOOT] Supabase connection OK")
    except Exception as e:
        print("[BOOT ERROR]", e)
        raise RuntimeError("Supabase connection failed")

    asyncio.create_task(keep_alive_loop())

@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase": supabase is not None
    }

@app.get("/")
def root():
    return {"status": "alive"}

secret_key: Optional[str] = get_env_var("SECRET_KEY")

if os.environ.get("ENV", "").lower() == "production" and not secret_key:
    raise RuntimeError("SECRET_KEY is required in production. Set SECRET_KEY in your environment.")

supabase = init_supabase()


def safe_supabase_call(callable_action, action_name: str = "supabase_call"):
    try:
        return callable_action()
    except Exception as e:
        log_qr_event("QR_ERROR", f"{action_name}_exception", error=str(e))
        raise HTTPException(status_code=500, detail={
            "error_code": "SUPABASE_CALL_FAILED",
            "action": action_name,
            "message": "Unexpected error while accessing Supabase.",
            "supabase_error": str(e)
        })


def safe_execute(query_fn, fallback=None):
    try:
        return query_fn()
    except Exception as e:
        print("[SAFE ERROR]", str(e))
        return fallback


# ─── RULE 4: FLEXIBLE TOKEN VALIDATION ─────────────────────────────────────
# Accepts t_<8-32 alphanumeric chars> — case insensitive, never breaks on
# valid tokens regardless of how they were generated.
TOKEN_PATTERN = re.compile(r"^t_[a-zA-Z0-9]{8,32}$")
SESSION_PATTERN = re.compile(r"^sess_[A-Za-z0-9_-]{16,}$")
PLACEHOLDER_PATTERNS = ["your-vercel", "your-backend", "example.com", "localhost:5173"]


def is_placeholder_url(value: Optional[str]) -> bool:
    if not isinstance(value, str) or not value.strip():
        return True
    lower = value.strip().lower()
    return any(pattern in lower for pattern in PLACEHOLDER_PATTERNS)


def log_qr_event(tag: str, message: str, **fields):
    field_parts = []
    for key, value in fields.items():
        field_parts.append(f"{key}={value}")
    print(f"[{tag}] {message}" + (" " + " ".join(field_parts) if field_parts else ""))


def validate_uuid(value: str, field_name: str):
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(status_code=400, detail={
            "error_code": "INVALID_ID_FORMAT",
            "field": field_name,
            "message": f"{field_name} must be a non-empty UUID string."
        })
    try:
        uuid.UUID(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail={
            "error_code": "INVALID_ID_FORMAT",
            "field": field_name,
            "message": f"{field_name} is not a valid UUID."
        })


def validate_qr_token(token: str):
    if not isinstance(token, str) or not TOKEN_PATTERN.match(token):
        raise HTTPException(status_code=400, detail={
            "error_code": "INVALID_TOKEN_FORMAT",
            "token": token,
            "message": "The qr_token format is invalid. Expected format: t_<8 hex chars>."
        })


def validate_session_id(session_id: str):
    if not isinstance(session_id, str) or not SESSION_PATTERN.match(session_id):
        raise HTTPException(status_code=400, detail={
            "error_code": "INVALID_SESSION_FORMAT",
            "session_id": session_id,
            "message": "The session_id format is invalid. Expected format: sess_<alphanumeric>."
        })


# ─── RULE 2: QR ALWAYS POINTS TO STABLE RENDER URL ─────────────────────────
# This is hardcoded. Even if QR_BASE_URL env var is missing, QR codes will
# always encode the correct production backend URL.
RENDER_BACKEND = "https://dineinflow.onrender.com"

def get_qr_base_url(request: Request | None = None) -> str:
    """Return the base URL for QR code links (the backend's public URL).
    Priority: QR_BASE_URL env var → RENDER_BACKEND constant → localhost (dev fallback)."""
    env_url = get_env_var("QR_BASE_URL") or get_env_var("BACKEND_URL")
    if env_url and not is_placeholder_url(env_url):
        return env_url.rstrip("/")
    # In production, always fall back to the known stable Render URL
    if os.environ.get("ENV", "").lower() == "production":
        return RENDER_BACKEND
    # Dev: use request base_url or localhost
    if request is not None:
        return str(request.base_url).rstrip("/")
    return "http://localhost:8000"

def get_authenticated_client(token: Optional[str] = None) -> Client:
    sb_url = get_env_var("SUPABASE_URL") or get_env_var("VITE_SUPABASE_URL", required=True)
    sb_key = get_env_var("SUPABASE_ANON_KEY") or get_env_var("VITE_SUPABASE_ANON_KEY", required=True)
    client = create_client(sb_url, sb_key)
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
    from reportlab.lib.pagesizes import A6
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from reportlab.lib import colors
    import qrcode

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
    validate_uuid(table_id, "table_id")
    client = get_authenticated_client(authorization)
    log_qr_event("QR_GENERATE", "request_received", table_id=table_id)

    table_res = safe_execute(
        lambda: client.table("tables").select("qr_token").eq("id", table_id).single().execute()
    )
    log_qr_event(
        "QR_GENERATE",
        "table_lookup",
        table_id=table_id,
        query_result=getattr(table_res, "data", None) if table_res else None,
        query_error=getattr(table_res, "error", None) if table_res else "safe_execute_failed"
    )

    if not table_res or getattr(table_res, "error", None):
        raise HTTPException(status_code=500, detail={
            "error_code": "TABLE_LOOKUP_FAILED",
            "table_id": table_id,
            "message": "Failed to fetch table details before generating QR.",
            "supabase_error": str(getattr(table_res, "error", "No response from database") if table_res else "No response")
        })

    if table_res.data and table_res.data.get("qr_token"):
        raise HTTPException(status_code=400, detail={
            "error_code": "QR_ALREADY_EXISTS",
            "table_id": table_id,
            "message": "QR code already generated for this table. Use regenerate instead."
        })
         
    token = f"t_{secrets.token_hex(4)}"
    res = safe_execute(
        lambda: client.table("tables").update({"qr_token": token}).eq("id", table_id).execute()
    )
    log_qr_event(
        "QR_GENERATE",
        "qr_update",
        table_id=table_id,
        qr_token=token,
        update_result=getattr(res, "data", None) if res else None,
        update_error=getattr(res, "error", None) if res else "safe_execute_failed"
    )

    if not res or getattr(res, "error", None) or not res.data:
         raise HTTPException(status_code=404, detail={
             "error_code": "TABLE_NOT_FOUND",
             "table_id": table_id,
             "message": "Table not found or unauthorized when creating QR token.",
             "supabase_error": str(getattr(res, "error", "No response from database") if res else "No response")
         })
    return {"success": True, "qr_token": token, "table": res.data[0]}

@app.post("/api/tables/{table_id}/regenerate-qr")
def regenerate_qr(table_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail={
            "error_code": "AUTHORIZATION_MISSING",
            "message": "Authorization header missing."
        })
    validate_uuid(table_id, "table_id")
    client = get_authenticated_client(authorization)
    log_qr_event("QR_REGENERATE", "request_received", table_id=table_id)
    
    try:
        user_res = client.auth.get_user()
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail={
                "error_code": "UNAUTHORIZED",
                "message": "Invalid auth token."
            })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail={
            "error_code": "AUTH_CHECK_FAILED",
            "message": f"Auth check failed: {str(e)}"
        })
    
    try:
        db_user = safe_execute(
            lambda: client.table("users").select("role").eq("id", user_res.user.id).single().execute()
        )
        log_qr_event(
            "QR_REGENERATE",
            "user_role_lookup",
            admin_id=user_res.user.id,
            query_result=getattr(db_user, "data", None) if db_user else None,
            query_error=getattr(db_user, "error", None) if db_user else "safe_execute_failed"
        )
        if not db_user or getattr(db_user, "error", None):
            raise HTTPException(status_code=500, detail={
                "error_code": "ROLE_LOOKUP_FAILED",
                "message": "Failed to verify admin role.",
                "supabase_error": str(getattr(db_user, "error", "No response from database") if db_user else "No response")
            })
        if not db_user.data or db_user.data.get("role") not in ["RESTAURANT_ADMIN", "SUPER_ADMIN"]:
            raise HTTPException(status_code=403, detail={
                "error_code": "INSUFFICIENT_PERMISSIONS",
                "message": "Only admins can regenerate table QR tokens."
            })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error_code": "ROLE_CHECK_EXCEPTION",
            "message": f"Failed to verify role: {str(e)}"
        })
        
    token = f"t_{secrets.token_hex(4)}"
    try:
        res = safe_execute(
            lambda: client.table("tables").update({"qr_token": token}).eq("id", table_id).execute()
        )
        log_qr_event(
            "QR_REGENERATE",
            "qr_update",
            table_id=table_id,
            qr_token=token,
            update_result=getattr(res, "data", None) if res else None,
            update_error=getattr(res, "error", None) if res else "safe_execute_failed"
        )
        if not res or getattr(res, "error", None) or not res.data:
            raise HTTPException(status_code=404, detail={
                "error_code": "TABLE_NOT_FOUND",
                "table_id": table_id,
                "message": "Table not found or you don't have permission to update it.",
                "supabase_error": str(getattr(res, "error", "No response from database") if res else "No response")
            })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error_code": "UPDATE_FAILED",
            "message": f"Failed to update QR token: {str(e)}"
        })
    
    return {"success": True, "qr_token": token, "table": res.data[0]}

@app.get("/order/{table_token}")
def handle_qr_scan(table_token: str, request: Request):
    # ─── RULE 4: Accept any t_<alphanum> token, don't be strict ─────────────
    # Soft-validate: if it doesn't look like a token at all, reject; otherwise proceed.
    if not table_token or not table_token.startswith("t_"):
        raise HTTPException(status_code=400, detail={
            "error_code": "INVALID_TOKEN",
            "message": "Invalid QR token format."
        })
    log_qr_event("QR_SCAN", "scan_request", token=table_token)

    table_res = safe_execute(
        lambda: supabase.table("tables").select("id, restaurant_id").eq("qr_token", table_token).execute()
    )
    log_qr_event("QR_SCAN", "table_lookup", query_result=getattr(table_res, "data", None) if table_res else None, query_error=getattr(table_res, "error", None) if table_res else "safe_execute_failed")

    if not table_res or getattr(table_res, "error", None):
        raise HTTPException(status_code=500, detail={
            "error_code": "TABLE_LOOKUP_FAILED",
            "token": table_token,
            "message": "Failed to look up table by qr_token.",
            "supabase_error": str(getattr(table_res, "error", "No response from database") if table_res else "No response")
        })

    if not table_res.data:
        raise HTTPException(status_code=404, detail={
            "error_code": "TOKEN_NOT_FOUND",
            "token": table_token,
            "message": "No table found with this qr_token. The QR code may be expired or invalid."
        })

    table = table_res.data[0]
    restaurant_id = table["restaurant_id"]
    table_id = table["id"]

    # ─── RULE 3: IDEMPOTENT SESSION FLOW ────────────────────────────────────
    # Check if an active session already exists for this table.
    # If yes, reuse it. This means scanning the same QR twice doesn't break the
    # customer's cart or create duplicate sessions.
    existing_res = safe_execute(
        lambda: supabase.table("customer_sessions")
            .select("session_id")
            .eq("table_id", table_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
    )
    log_qr_event("QR_SESSION", "existing_session_check", table_id=table_id, result=getattr(existing_res, "data", None) if existing_res else None)

    if existing_res and existing_res.data and len(existing_res.data) > 0:
        # Reuse the most recent session for this table
        session_id = existing_res.data[0]["session_id"]
        log_qr_event("QR_SESSION", "reusing_existing_session", session_id=session_id, table_id=table_id)
    else:
        # Create a brand-new session
        session_id = f"sess_{secrets.token_urlsafe(16)}"
        insert_res = safe_execute(
            lambda: supabase.table("customer_sessions").insert({
                "session_id": session_id,
                "restaurant_id": restaurant_id,
                "table_id": table_id
            }).execute()
        )

        if not insert_res or getattr(insert_res, "error", None):
            error_val = getattr(insert_res, "error", "safe_execute_failed") if insert_res else "No response from database"
            log_qr_event("QR_SESSION", "insert_failed", error=str(error_val))
            raise HTTPException(status_code=500, detail={
                "error_code": "SESSION_INSERT_FAILED"
            })

        if not insert_res.data:
            log_qr_event("QR_SESSION", "insert_empty", error="No data returned from session insert")
            raise HTTPException(status_code=500, detail={
                "error_code": "SESSION_INSERT_FAILED"
            })

    # ─── RULE 2: REDIRECT TO HARDCODED STABLE FRONTEND URL ───────────────────
    configured_frontend = frontend_url
    is_placeholder = is_placeholder_url(configured_frontend)
    host = request.headers.get("host", "")
    if is_placeholder and ("localhost" in host or "127.0.0.1" in host):
        current_frontend_url = "http://localhost:5173"
    elif is_placeholder:
        log_qr_event("QR_ERROR", "invalid_frontend_url", frontend_url=configured_frontend, host=host)
        raise HTTPException(status_code=500, detail={
            "error_code": "INVALID_FRONTEND_URL",
            "message": "Backend FRONTEND_URL is not configured. Set it in your environment variables."
        })
    else:
        current_frontend_url = frontend_origins[0] if frontend_origins else configured_frontend

    redirect_url = f"{current_frontend_url}/menu?session_id={session_id}"
    log_qr_event("QR_REDIRECT", "redirect", destination=redirect_url)

    # ─── STEP 6: Fix your QR scan reliability ────────────────────────────────
    # Return JSONResponse to prevent browser caching/307 redirection quirks.
    # To support direct browser scans, we return a script-based HTML redirect if
    # the client accepts text/html, otherwise return JSONResponse.
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        from fastapi.responses import HTMLResponse
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>Redirecting...</title>
    <script>
        window.location.replace("{redirect_url}");
    </script>
</head>
<body>
    <p>Redirecting to menu...</p>
</body>
</html>"""
        return HTMLResponse(content=html_content, status_code=200)

    return JSONResponse({
        "success": True,
        "redirect": redirect_url,
        "session_id": session_id
    })

@app.get("/api/session/{session_id}")
def get_session_details(session_id: str):
    validate_session_id(session_id)
    log_qr_event("QR_SESSION", "session_request", session_id=session_id)

    session_res = safe_execute(
        lambda: supabase.table("customer_sessions").select("restaurant_id, table_id").eq("session_id", session_id).execute()
    )
    log_qr_event(
        "QR_SESSION",
        "session_lookup",
        session_id=session_id,
        query_result=getattr(session_res, "data", None) if session_res else None,
        query_error=getattr(session_res, "error", None) if session_res else "safe_execute_failed"
    )

    if not session_res or getattr(session_res, "error", None):
        raise HTTPException(status_code=500, detail={
            "error_code": "SESSION_LOOKUP_FAILED",
            "session_id": session_id,
            "message": "Failed to fetch session details.",
            "supabase_error": str(getattr(session_res, "error", "No response from database") if session_res else "No response")
        })

    if not session_res.data:
        raise HTTPException(status_code=404, detail={
            "error_code": "SESSION_NOT_FOUND",
            "session_id": session_id,
            "message": "Session not found. Please scan the table QR code again."
        })
        
    sess = session_res.data[0]
    
    restaurant_name = "Restaurant"
    rest_res = safe_execute(
        lambda: supabase.table("restaurants").select("name").eq("id", sess["restaurant_id"]).execute()
    )
    log_qr_event("QR_SESSION", "restaurant_lookup", restaurant_id=sess["restaurant_id"], result=getattr(rest_res, "data", None) if rest_res else None, error=getattr(rest_res, "error", None) if rest_res else "safe_execute_failed")
    if rest_res and rest_res.data and len(rest_res.data) > 0:
        restaurant_name = rest_res.data[0].get("name", "Restaurant")
        
    table_number = "N/A"
    table_res = safe_execute(
        lambda: supabase.table("tables").select("table_number").eq("id", sess["table_id"]).execute()
    )
    log_qr_event("QR_SESSION", "table_lookup", table_id=sess["table_id"], result=getattr(table_res, "data", None) if table_res else None, error=getattr(table_res, "error", None) if table_res else "safe_execute_failed")
    if table_res and table_res.data and len(table_res.data) > 0:
        table_number = table_res.data[0].get("table_number", "N/A")
    
    return {
        "session_id": session_id,
        "restaurant_id": sess["restaurant_id"],
        "table_id": sess["table_id"],
        "restaurant_name": restaurant_name,
        "table_number": table_number
    }

@app.get("/api/tables/{table_id}/qr-code-image")
def get_qr_image(table_id: str, request: Request):
    validate_uuid(table_id, "table_id")
    log_qr_event("QR_GENERATE", "qr_image_request", table_id=table_id)

    table_res = safe_execute(
        lambda: supabase.table("tables").select("qr_token").eq("id", table_id).single().execute()
    )
    log_qr_event("QR_GENERATE", "qr_image_lookup", table_id=table_id,
                 query_result=getattr(table_res, "data", None) if table_res else None,
                 query_error=getattr(table_res, "error", None) if table_res else "safe_execute_failed")

    if not table_res or getattr(table_res, "error", None):
        raise HTTPException(status_code=500, detail={
            "error_code": "TABLE_LOOKUP_FAILED",
            "table_id": table_id,
            "message": "Failed to fetch QR token for the table.",
            "supabase_error": str(getattr(table_res, "error", "No response from database") if table_res else "No response")
        })

    if not table_res.data or not table_res.data.get("qr_token"):
        raise HTTPException(status_code=404, detail={
            "error_code": "QR_NOT_GENERATED",
            "table_id": table_id,
            "message": "QR Code not generated for this table yet."
        })

    token = table_res.data["qr_token"]

    # ─── RULE 2 HARD FIX: QR always encodes the stable Render URL ───────────
    # No env var dependency. No function call. Hardcoded. Cannot break.
    QR_BASE = "https://dineinflow.onrender.com"
    qr_url = f"{QR_BASE}/order/{token}"
    log_qr_event("QR_GENERATE", "qr_image_url", table_id=table_id, qr_url=qr_url)

    import qrcode
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
    validate_uuid(table_id, "table_id")
    log_qr_event("QR_GENERATE", "qr_pdf_request", table_id=table_id)

    table_res = safe_execute(
        lambda: supabase.table("tables").select("table_number, restaurant_id, qr_token").eq("id", table_id).single().execute()
    )
    log_qr_event(
        "QR_GENERATE",
        "qr_pdf_lookup",
        table_id=table_id,
        query_result=getattr(table_res, "data", None) if table_res else None,
        query_error=getattr(table_res, "error", None) if table_res else "safe_execute_failed"
    )
    if not table_res or getattr(table_res, "error", None):
        raise HTTPException(status_code=500, detail={
            "error_code": "TABLE_LOOKUP_FAILED",
            "table_id": table_id,
            "message": "Failed to fetch QR token for the table.",
            "supabase_error": str(getattr(table_res, "error", "No response from database") if table_res else "No response")
        })

    if not table_res.data or not table_res.data.get("qr_token"):
        raise HTTPException(status_code=404, detail={
            "error_code": "QR_NOT_GENERATED",
            "table_id": table_id,
            "message": "QR Code not generated for this table yet."
        })
        
    table_data = table_res.data
    token = table_data["qr_token"]
    table_num = table_data["table_number"]
    rest_id = table_data["restaurant_id"]
    
    rest_name = "Restaurant"
    rest_res = safe_execute(
        lambda: supabase.table("restaurants").select("name").eq("id", rest_id).single().execute()
    )
    log_qr_event(
        "QR_GENERATE",
        "restaurant_lookup",
        restaurant_id=rest_id,
        query_result=getattr(rest_res, "data", None) if rest_res else None,
        query_error=getattr(rest_res, "error", None) if rest_res else "safe_execute_failed"
    )
    if rest_res and rest_res.data:
        rest_name = rest_res.data.get("name", "Restaurant")
    
    # ─── RULE 2 HARD FIX: QR always encodes the stable Render URL ───────────
    # No env var dependency. No function call. Hardcoded. Cannot break.
    QR_BASE = "https://dineinflow.onrender.com"
    qr_url = f"{QR_BASE}/order/{token}"
    log_qr_event("QR_GENERATE", "qr_pdf_url", table_id=table_id, qr_url=qr_url)
    pdf_buffer = generate_pdf_buffer(rest_name, table_num, qr_url)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=table_{table_num}_qr.pdf"}
    )

@app.post("/api/orders/place")
def place_customer_order(req: PlaceOrderRequest):
    session_res = safe_execute(
        lambda: supabase.table("customer_sessions").select("restaurant_id, table_id").eq("session_id", req.session_id).execute()
    )
    if not session_res or not session_res.data:
        raise HTTPException(status_code=400, detail="Invalid session. Please scan table QR code again.")
        
    sess = session_res.data[0]
    restaurant_id = sess["restaurant_id"]
    table_id = sess["table_id"]
    
    menu_item_ids = [item.menu_item_id for item in req.items]
    menu_res = safe_execute(
        lambda: supabase.table("menu_items").select("id, price").in_("id", menu_item_ids).execute()
    )
    
    if not menu_res or not menu_res.data:
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
    
    order_res = safe_execute(
        lambda: supabase.table("orders").insert([order_payload]).execute()
    )
    if not order_res or not order_res.data:
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
        
    items_res = safe_execute(
        lambda: supabase.table("order_items").insert(order_items_payload).execute()
    )
    if not items_res or not items_res.data:
        safe_execute(lambda: supabase.table("orders").delete().eq("id", order_id).execute())
        raise HTTPException(status_code=500, detail="Failed to create order items.")
        
    safe_execute(lambda: supabase.table("tables").update({"status": "occupied"}).eq("id", table_id).execute())
    
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
    
    db_user = safe_execute(
        lambda: client.table("users").select("role, email, full_name").eq("id", user_res.user.id).single().execute()
    )
    if not db_user or not db_user.data or db_user.data.get("role") != "SUPER_ADMIN":
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
    rest_res = safe_execute(
        lambda: client.table("restaurants").select("id, name").eq("id", restaurant_id).single().execute()
    )
    if not rest_res or not rest_res.data:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    
    restaurant = rest_res.data
    
    # Create audit log entry
    safe_execute(
        lambda: client.table("audit_logs").insert({
            "super_admin_id": admin_user["id"],
            "super_admin_email": admin_user["email"],
            "restaurant_id": restaurant["id"],
            "restaurant_name": restaurant["name"],
            "action": "IMPERSONATE_START",
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", ""),
        }).execute()
    )
    
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
    safe_execute(
        lambda: client.table("audit_logs").insert({
            "super_admin_id": admin_user["id"],
            "super_admin_email": admin_user["email"],
            "restaurant_id": req.restaurant_id,
            "restaurant_name": req.restaurant_name,
            "action": "IMPERSONATE_END",
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", ""),
        }).execute()
    )
    
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
    res = safe_execute(lambda: query.execute())
    
    return {
        "logs": getattr(res, "data", []) if res else [],
        "total_count": getattr(res, "count", 0) if res else 0,
        "page": page,
        "limit": limit,
        "total_pages": max(1, -(-((getattr(res, "count", 0) if res else 0)) // limit)),  # Ceiling division
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

