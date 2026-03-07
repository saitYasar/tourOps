'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LatLng, Restaurant } from '@/types';
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

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedRestaurantId?: string | null;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  route?: LatLng[];
  showRoute?: boolean;
  center?: LatLng;
  zoom?: number;
  height?: string;
}

export function RestaurantMap({
  restaurants,
  selectedRestaurantId,
  onRestaurantSelect,
  route = [],
  showRoute = false,
  center = { lat: 41.0082, lng: 28.9784 },
  zoom = 12,
  height = '400px',
}: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);
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

    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded, L, center.lat, center.lng, zoom]);

  // Restoran marker'larını güncelle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Önceki marker'ları kaldır
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current.clear();

    // Custom icon oluştur
    const createIcon = (isSelected: boolean) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${isSelected ? '40px' : '32px'};
            height: ${isSelected ? '40px' : '32px'};
            background: ${isSelected ? '#dc2626' : '#3b82f6'};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          ">
            <svg width="${isSelected ? '20' : '16'}" height="${isSelected ? '20' : '16'}" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
        popupAnchor: [0, -32],
      });
    };

    // Restaurant marker'ları ekle
    restaurants.forEach((restaurant) => {
      const isSelected = restaurant.id === selectedRestaurantId;
      const marker = L.marker([restaurant.location.lat, restaurant.location.lng], {
        icon: createIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      // Popup content
      const popupContent = `
        <div style="min-width: 200px; padding: 4px;">
          ${restaurant.photoUrl ? `<img src="${restaurant.photoUrl}" alt="${restaurant.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />` : ''}
          <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${restaurant.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">${restaurant.address}</p>
          ${restaurant.phone ? `<p style="margin: 0; font-size: 12px; color: #64748b;">${restaurant.phone}</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'restaurant-popup',
      });

      if (onRestaurantSelect) {
        marker.on('click', () => {
          onRestaurantSelect(restaurant);
        });
      }

      markersRef.current.set(restaurant.id, marker);
    });

    // Fit bounds to show all markers
    if (restaurants.length > 0) {
      const bounds = L.latLngBounds(
        restaurants.map((r) => [r.location.lat, r.location.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [restaurants, selectedRestaurantId, onRestaurantSelect, L]);

  // Route polyline güncelle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Önceki polyline'ı kaldır
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (showRoute && route.length > 1) {
      const latLngs = route.map((p) => L.latLng(p.lat, p.lng));
      polylineRef.current = L.polyline(latLngs, {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10',
      }).addTo(map);
    }
  }, [route, showRoute, L]);

  // Selected marker'i vurgula
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L || !selectedRestaurantId) return;

    const marker = markersRef.current.get(selectedRestaurantId);
    if (marker) {
      const restaurant = restaurants.find((r) => r.id === selectedRestaurantId);
      if (restaurant) {
        map.setView([restaurant.location.lat, restaurant.location.lng], 15, {
          animate: true,
        });
        marker.openPopup();
      }
    }
  }, [selectedRestaurantId, restaurants, L]);

  if (!isLoaded) {
    return (
      <div
        className="w-full bg-slate-100 flex items-center justify-center rounded-lg"
        style={{ height }}
      >
        <p className="text-slate-500">{t.tours.loadingMap}</p>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full rounded-lg" style={{ height }} />
  );
}
