const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

if (!apiBaseUrl && import.meta.env.MODE === 'production') {
  throw new Error('Missing VITE_API_URL in production. Set VITE_API_URL in your environment.');
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
