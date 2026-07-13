import 'server-only';

import {
  HK_ZONE_COORDS,
  isLegacyDropoffFallback,
  resolveDistrictCoordinates,
  type GeoPoint,
} from '@/lib/delivery/coords';

export {
  HK_ZONE_COORDS,
  HK_DISTRICT_COORDS,
  isLegacyDropoffFallback,
  resolveDistrictCoordinates,
  type GeoPoint,
} from '@/lib/delivery/coords';

export type ResolvedDropoff = GeoPoint & {
  source: 'geocode' | 'district' | 'region';
  label?: string;
};

async function nominatimSearch(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const q = encodeURIComponent(trimmed);
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

export async function geocodeHongKongAddress(
  address: string,
  zoneName?: string | null
): Promise<GeoPoint | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const queries = [
    zoneName ? `${trimmed}, ${zoneName}, 香港` : null,
    zoneName ? `${trimmed}, ${zoneName}, Hong Kong` : null,
    `${trimmed}, 香港`,
    `${trimmed}, Hong Kong`,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    const hit = await nominatimSearch(query);
    if (hit) return hit;
  }

  return null;
}

export async function resolveDropoffCoordinates(
  address: string | null | undefined,
  zoneSlug?: string | null,
  zoneName?: string | null
): Promise<ResolvedDropoff | null> {
  if (address?.trim()) {
    const geocoded = await geocodeHongKongAddress(address, zoneName);
    if (geocoded) {
      return { ...geocoded, source: 'geocode' };
    }
  }

  const district = resolveDistrictCoordinates(zoneSlug);
  if (district) {
    return {
      lat: district.lat,
      lng: district.lng,
      source: 'district',
      label: district.label,
    };
  }

  return null;
}

/** 讀取／建立配送任務時補全送達座標（修正舊版九龍預設點） */
export async function repairDropoffCoordinates(input: {
  dropoffAddress: string | null | undefined;
  dropoffLat: number | null;
  dropoffLng: number | null;
  zoneSlug?: string | null;
  zoneName?: string | null;
}): Promise<ResolvedDropoff | null> {
  const lat = input.dropoffLat;
  const lng = input.dropoffLng;
  const hasCoords = lat != null && lng != null;
  const isWrongDefault = hasCoords && isLegacyDropoffFallback(lat, lng);

  if (hasCoords && !isWrongDefault) {
    return { lat, lng, source: 'geocode' };
  }

  return resolveDropoffCoordinates(input.dropoffAddress, input.zoneSlug, input.zoneName);
}
