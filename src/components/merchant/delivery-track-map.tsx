'use client';

import { useEffect, useRef } from 'react';
import type { GeoPoint } from '@/lib/delivery/coords';

type DeliveryTrackMapProps = {
  dropoff: GeoPoint;
  courier?: GeoPoint | null;
  pickup?: GeoPoint | null;
  className?: string;
};

export function DeliveryTrackMap({ dropoff, courier, pickup, className }: DeliveryTrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    void import('leaflet').then((L) => {
      if (!mounted || !containerRef.current) return;

      import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
      }).setView([dropoff.lat, dropoff.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const dropIcon = L.divIcon({
        className: '',
        html: `<div style="background:#f97316;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.2)">📍 送達</div>`,
        iconAnchor: [40, 20],
      });

      L.marker([dropoff.lat, dropoff.lng], { icon: dropIcon }).addTo(map);

      const points: [number, number][] = [[dropoff.lat, dropoff.lng]];

      if (pickup) {
        L.circleMarker([pickup.lat, pickup.lng], {
          radius: 8,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup('取件點');
        points.push([pickup.lat, pickup.lng]);
      }

      if (courier) {
        const courierIcon = L.divIcon({
          className: '',
          html: `<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2)">🛵 配送員</div>`,
          iconAnchor: [36, 20],
        });
        L.marker([courier.lat, courier.lng], { icon: courierIcon }).addTo(map);
        points.push([courier.lat, courier.lng]);

        L.polyline(
          [
            [courier.lat, courier.lng],
            [dropoff.lat, dropoff.lng],
          ],
          { color: '#22c55e', dashArray: '6 8', weight: 3 }
        ).addTo(map);
      }

      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
      }

      mapRef.current = map;
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    void import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && (layer as L.Marker & { _isCourier?: boolean })._isCourier) {
          map.removeLayer(layer);
        }
      });

      if (courier) {
        const courierIcon = L.divIcon({
          className: '',
          html: `<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2)">🛵 配送員</div>`,
          iconAnchor: [36, 20],
        });
        const m = L.marker([courier.lat, courier.lng], { icon: courierIcon });
        (m as L.Marker & { _isCourier?: boolean })._isCourier = true;
        m.addTo(map);
      }
    });
  }, [courier?.lat, courier?.lng, dropoff.lat, dropoff.lng]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-[360px] w-full rounded-2xl border border-gray-200 dark:border-gray-700 z-0'}
    />
  );
}
