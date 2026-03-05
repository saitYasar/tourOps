'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LatLng } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Leaflet CSS'i dinamik olarak yukle
const loadLeafletCSS = () => {
  if (typeof window === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;

  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

interface RouteMapProps {
  route: LatLng[];
  onRouteChange: (route: LatLng[]) => void;
  isDrawMode: boolean;
  restaurantMarkers?: Array<{ id: string; location: LatLng; name: string }>;
  onRestaurantClick?: (id: string) => void;
}

export function RouteMap({
  route,
  onRouteChange,
  isDrawMode,
  restaurantMarkers = [],
  onRestaurantClick,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const restaurantMarkersRef = useRef<L.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const { t } = useLanguage();

  // Leaflet'i dinamik olarak yukle
  useEffect(() => {
    loadLeafletCSS();

    import('leaflet').then((leaflet) => {
      // Fix default marker icon issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(leaflet);
      setIsLoaded(true);
    });
  }, []);

  // Haritayi baslat
  useEffect(() => {
    if (!isLoaded || !L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([41.0082, 28.9784], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded, L]);

  // Rota cizimi icin click handler
  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (!isDrawMode) return;
      const newPoint: LatLng = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };
      onRouteChange([...route, newPoint]);
    },
    [isDrawMode, route, onRouteChange]
  );

  // Click handler'i ekle/kaldir
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isDrawMode) {
      map.on('click', handleMapClick);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawMode, handleMapClick]);

  // Rota polyline ve marker'larını güncelle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Önceki polyline'ı kaldır
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    // Önceki marker'ları kaldır
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    if (route.length > 0) {
      // Yeni polyline çiz
      const latLngs = route.map((p) => L.latLng(p.lat, p.lng));
      polylineRef.current = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 4,
      }).addTo(map);

      // Add markers to route points
      route.forEach((point, index) => {
        const marker = L.marker([point.lat, point.lng])
          .addTo(map)
          .bindPopup(`${t.tours.point} ${index + 1}`);
        markersRef.current.push(marker);
      });

      // Haritayı rotaya fit et
      if (route.length > 1) {
        map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
      }
    }
  }, [route, L]);

  // Restoran marker'larını güncelle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Önceki restoran marker'larını kaldır
    restaurantMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    restaurantMarkersRef.current = [];

    // Yeni marker'lar ekle
    const restaurantIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    restaurantMarkers.forEach((restaurant) => {
      const marker = L.marker([restaurant.location.lat, restaurant.location.lng], {
        icon: restaurantIcon,
      })
        .addTo(map)
        .bindPopup(restaurant.name);

      if (onRestaurantClick) {
        marker.on('click', () => onRestaurantClick(restaurant.id));
      }

      restaurantMarkersRef.current.push(marker);
    });
  }, [restaurantMarkers, onRestaurantClick, L]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">{t.tours.loadingMap}</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
