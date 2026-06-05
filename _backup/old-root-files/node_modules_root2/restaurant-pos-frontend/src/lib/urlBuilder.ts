/**
 * Utility for building table-specific self-ordering menu URLs.
 */
export function buildTableMenuUrl(restaurantSlug: string, tableNumber: string): string {
  // Read configured public app URL, fallback to current browser origin if unset
  const baseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
  return `${baseUrl}/r/${restaurantSlug}/t/${tableNumber}`;
}
