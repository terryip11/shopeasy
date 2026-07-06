import 'server-only';

import { HK_ZONE_COORDS, type GeoPoint } from '@/lib/delivery/coords';
export { HK_ZONE_COORDS, type GeoPoint } from '@/lib/delivery/coords';

export async function geocodeHongKongAddress(address: string): Promise<GeoPoint | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const q = encodeURIComponent(`${trimmed}, Hong Kong`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=hk`,
      {
        headers: { 'User-Agent': 'ShopEasy/1.0 (merchant delivery tracking)' },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    const hit = data[0];
    if (!hit) return null;

    return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
  } catch {
    return null;
  }
}

export async function resolveDropoffCoordinates(
  address: string | null | undefined,
  zoneSlug?: string | null
): Promise<GeoPoint | null> {
  if (address) {
    const geocoded = await geocodeHongKongAddress(address);
    if (geocoded) return geocoded;
  }

  if (zoneSlug && HK_ZONE_COORDS[zoneSlug]) {
    const z = HK_ZONE_COORDS[zoneSlug];
    return { lat: z.lat, lng: z.lng };
  }

  return { lat: 22.3193, lng: 114.1694 };
}
