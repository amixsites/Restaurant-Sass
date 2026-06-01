import { supabase } from '@/lib/supabase';

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

// In production, VITE_API_URL should be set to your backend URL (e.g. https://dineinflow.onrender.com).
// If it's not set, requests fall back to relative paths (/api/...) which are proxied
// by vercel.json rewrites → backend. Both paths work correctly.
if (!apiBaseUrl && import.meta.env.MODE === 'production') {
  console.warn(
    '[DineSwift] VITE_API_URL is not set. Falling back to Vercel /api proxy rewrite. ' +
    'Set VITE_API_URL=https://dineinflow.onrender.com in Vercel environment variables for best performance.'
  );
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // If apiBaseUrl is set, use absolute URL to backend directly.
  // Otherwise use relative path — Vercel rewrites will forward /api/... to Render.
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    await supabase.auth.signOut();
    throw new Error('Session invalid or expired. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}
