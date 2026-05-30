import { supabase } from '@/lib/supabase';

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

if (!apiBaseUrl && import.meta.env.MODE === 'production') {
  throw new Error('Missing VITE_API_URL in production. Set VITE_API_URL in your environment.');
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
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
