import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH
// Frontend operates entirely client-side via Supabase SDK.
// Python backend is only used for local QA/E2E testing and simulation.
// ─────────────────────────────────────────────────────────────────────────────

function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  
  const isLocalHostSite =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null' && envUrl.trim() !== '') {
    return envUrl;
  }

  // Fallback to local API proxy during localhost development for simulation control
  if (isLocalHostSite) {
    return ''; // dev → Vite proxy → localhost:8000
  }

  return ''; // Production frontend doesn't query Python backend
}

export const API_BASE = resolveApiBase();

/** @deprecated Use direct Supabase queries instead. Left for backward-compatibility only. */
export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPED API ENDPOINT MAP (Local development & simulation only)
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // ── Simulation (Super Admin testing tools on localhost only) ───────────────
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
// FETCH WITH RETRY
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
      return await fetch(url, options);
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

