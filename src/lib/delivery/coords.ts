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

/** 香港三大區域中心座標（geocode 失敗且無法對應 18 區時的備用） */
export const HK_ZONE_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'hk-island': { lat: 22.2819, lng: 114.1588, label: '港島' },
  kowloon: { lat: 22.3193, lng: 114.1694, label: '九龍' },
  'new-territories': { lat: 22.3811, lng: 114.1871, label: '新界' },
};

/** 舊版錯誤預設點（九龍中心）；geocode 失敗且區域 slug 未對應時曾誤用 */
export const LEGACY_DROPOFF_FALLBACK = HK_ZONE_COORDS.kowloon;

/** 香港 18 區中心座標（對應 delivery_zones.slug） */
export const HK_DISTRICT_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'central-western': { lat: 22.2819, lng: 114.1549, label: '中西區' },
  'wan-chai': { lat: 22.2775, lng: 114.1719, label: '灣仔' },
  eastern: { lat: 22.2841, lng: 114.2241, label: '東區' },
  southern: { lat: 22.2472, lng: 114.1589, label: '南區' },
  'yau-tsim-mong': { lat: 22.3056, lng: 114.1716, label: '油尖旺' },
  'sham-shui-po': { lat: 22.3308, lng: 114.1622, label: '深水埗' },
  'kowloon-city-district': { lat: 22.3282, lng: 114.1915, label: '九龍城' },
  'wong-tai-sin': { lat: 22.342, lng: 114.1939, label: '黃大仙' },
  'kwun-tong': { lat: 22.3132, lng: 114.2258, label: '觀塘' },
  'kwai-tsing': { lat: 22.3549, lng: 114.0842, label: '葵青' },
  'tsuen-wan': { lat: 22.3707, lng: 114.1133, label: '荃灣' },
  'tuen-mun': { lat: 22.3916, lng: 113.9775, label: '屯門' },
  'yuen-long': { lat: 22.4575, lng: 114.0027, label: '元朗' },
  'north-district': { lat: 22.4947, lng: 114.1381, label: '北區' },
  'tai-po': { lat: 22.4505, lng: 114.1644, label: '大埔' },
  'sha-tin': { lat: 22.3813, lng: 114.1951, label: '沙田' },
  'sai-kung': { lat: 22.3811, lng: 114.2709, label: '西貢' },
  islands: { lat: 22.2611, lng: 113.9461, label: '離島' },
};

export function isLegacyDropoffFallback(lat: number, lng: number): boolean {
  const d = LEGACY_DROPOFF_FALLBACK;
  return Math.abs(lat - d.lat) < 0.0001 && Math.abs(lng - d.lng) < 0.0001;
}

export function resolveDistrictCoordinates(
  zoneSlug?: string | null
): GeoPoint & { label: string } | null {
  if (!zoneSlug) return null;
  const district = HK_DISTRICT_COORDS[zoneSlug];
  if (district) {
    return { lat: district.lat, lng: district.lng, label: district.label };
  }
  const region = HK_ZONE_COORDS[zoneSlug];
  if (region) {
    return { lat: region.lat, lng: region.lng, label: region.label };
  }
  return null;
}
