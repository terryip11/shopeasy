export type GeoPoint = { lat: number; lng: number };

/** 兩點之間距離（米） */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 香港三大區域中心座標（geocode 失敗時的備用） */
export const HK_ZONE_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'hk-island': { lat: 22.2819, lng: 114.1588, label: '港島' },
  kowloon: { lat: 22.3193, lng: 114.1694, label: '九龍' },
  'new-territories': { lat: 22.3811, lng: 114.1871, label: '新界' },
};
