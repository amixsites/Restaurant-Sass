import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH
// ALL API calls go to Render. NEVER to Vercel. No exceptions.
// Priority: VITE_API_URL env var → hardcoded Render URL → localhost (dev only)
// ─────────────────────────────────────────────────────────────────────────────
const RENDER_BACKEND = 'https://dineinflow.onrender.com';

function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null' && envUrl.trim() !== '') {
    return envUrl;
  }
  // Fallback to Render production backend on any Vercel domain or external host
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return RENDER_BACKEND;
  }
  if (import.meta.env.MODE === 'production') return RENDER_BACKEND;
  return ''; // dev → Vite proxy → localhost:8000
}

export const API_BASE = resolveApiBase();

/** @deprecated Use `api.*` typed methods instead. Only for one-off paths. */
export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPED API ENDPOINT MAP
// Use these everywhere. Never hardcode /api/... strings in components.
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // ── Sessions ──────────────────────────────────────────────────────────────
  session:        (id: string)      => `${API_BASE}/api/session/${id}`,

  // ── QR Code ───────────────────────────────────────────────────────────────
  generateQR:     (tableId: string) => `${API_BASE}/api/tables/${tableId}/generate-qr`,
  regenerateQR:   (tableId: string) => `${API_BASE}/api/tables/${tableId}/regenerate-qr`,
  qrImage:        (tableId: string, bust = 0) =>
                    `${API_BASE}/api/tables/${tableId}/qr-code-image${bust ? `?t=${bust}` : ''}`,
  qrPdf:          (tableId: string) => `${API_BASE}/api/tables/${tableId}/qr-code-pdf`,

  // ── Orders ────────────────────────────────────────────────────────────────
  placeOrder:     ()                => `${API_BASE}/api/orders/place`,

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics:      (restaurantId: string, range = 'Weekly') =>
                    `${API_BASE}/api/analytics/${restaurantId}?range=${range}`,

  // ── Simulation ────────────────────────────────────────────────────────────
  simStatus:      ()                => `${API_BASE}/api/simulation/status`,
  simStart:       ()                => `${API_BASE}/api/simulation/start`,
  simPause:       ()                => `${API_BASE}/api/simulation/pause`,
  simStop:        ()                => `${API_BASE}/api/simulation/stop`,
  simClear:       ()                => `${API_BASE}/api/simulation/clear`,
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HEADERS
// ─────────────────────────────────────────────────────────────────────────────
export async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    await supabase.auth.signOut();
    throw new Error('Session invalid or expired. Please sign in again.');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH WITH RETRY — handles Render cold starts (503/504) and network blips
// Usage: const res = await fetchWithRetry(api.session(id))
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 800,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Retry on Render cold start (503) or gateway timeout (504)
      if ((res.status === 503 || res.status === 504) && attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt); // 800ms, 1.6s, 3.2s
        console.warn(`[API] ${res.status} – retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[API] Network error – retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('Backend unavailable after retries.');
}
