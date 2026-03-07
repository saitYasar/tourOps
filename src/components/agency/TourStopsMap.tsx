'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrganizationPublicDto, ApiTourStopDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

const loadLeafletCSS = () => {
  if (typeof window === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

interface TourStopsMapProps {
  stops: ApiTourStopDto[];
  organizations: OrganizationPublicDto[];
  highlightedStopId?: number | null;
  onOrganizationClick?: (org: OrganizationPublicDto) => void;
  onStopClick?: (stop: ApiTourStopDto) => void;
  height?: string;
}

export function TourStopsMap({
  stops,
  organizations,
  highlightedStopId,
  onOrganizationClick,
  onStopClick,
  height = '450px',
}: TourStopsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const { t } = useLanguage();

  // Stop organization IDs for quick lookup
  const stopOrgIds = new Set(stops.map((s) => s.organizationId));

  // Build stop coords from organizations
  const stopCoords = stops
    .map((stop) => {
      const org = organizations.find((o) => o.id === stop.organizationId);
      if (org?.lat && org?.lng) {
        return { lat: Number(org.lat), lng: Number(org.lng), stop, org };
      }
      return null;
    })
    .filter(Boolean) as { lat: number; lng: number; stop: ApiTourStopDto; org: OrganizationPublicDto }[];

  // Available orgs (have coords, not already a stop)
  const availableOrgs = organizations.filter(
    (o) => o.lat && o.lng && !stopOrgIds.has(o.id)
  );

  useEffect(() => {
    loadLeafletCSS();
    import('leaflet').then((leaflet) => {
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

  // Init map
  useEffect(() => {
    if (!isLoaded || !L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([41.0082, 28.9784], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded, L]);

  // Update markers & route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    // Clear old
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const allBounds: [number, number][] = [];

    // 1) Stop markers (numbered, blue/green)
    stopCoords.forEach(({ lat, lng, stop, org }, index) => {
      const isHighlighted = highlightedStopId === stop.id;
      const size = isHighlighted ? 36 : 30;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'tour-stop-marker',
          html: `
            <div style="
              width: ${size}px; height: ${size}px;
              background: ${isHighlighted ? '#16a34a' : '#2563eb'};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              color: white; font-weight: 700; font-size: 14px;
              transition: all 0.2s;
            ">${index + 1}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        }),
        zIndexOffset: isHighlighted ? 2000 : 1000,
      }).addTo(map);

      const time = stop.scheduledStartTime
        ? `${new Date(stop.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(stop.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : '';

      marker.bindPopup(`
        <div style="min-width: 180px; padding: 4px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            <span style="background:#2563eb;color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;margin-right:6px;">${index + 1}</span>
            ${org.name}
          </div>
          <p style="margin: 0; font-size: 12px; color: #64748b;">${org.address || ''}</p>
          ${time ? `<p style="margin: 4px 0 0; font-size: 12px; color: #334155;">🕐 ${time}</p>` : ''}
        </div>
      `);

      if (onStopClick) {
        marker.on('click', () => onStopClick(stop));
      }

      markersRef.current.set(`stop-${stop.id}`, marker);
      allBounds.push([lat, lng]);
    });

    // 2) Route polyline between stops
    if (stopCoords.length > 1) {
      const latLngs = stopCoords.map(({ lat, lng }) => L.latLng(lat, lng));
      polylineRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 8',
      }).addTo(map);
    }

    // 3) Available organization markers (gray/smaller, clickable)
    availableOrgs.forEach((org) => {
      const lat = Number(org.lat);
      const lng = Number(org.lng);

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'available-org-marker',
          html: `
            <div style="
              width: 24px; height: 24px;
              background: #94a3b8;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 1px 4px rgba(0,0,0,0.2);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        }),
        zIndexOffset: 0,
      }).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 180px; padding: 4px;">
          <h3 style="margin: 0 0 4px; font-weight: 600; font-size: 14px;">${org.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #64748b;">${org.address || ''}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #3b82f6; cursor: pointer;">+ Durak olarak ekle</p>
        </div>
      `);

      if (onOrganizationClick) {
        marker.on('click', () => onOrganizationClick(org));
      }

      markersRef.current.set(`org-${org.id}`, marker);
      allBounds.push([lat, lng]);
    });

    // Fit bounds
    if (allBounds.length > 0) {
      map.fitBounds(L.latLngBounds(allBounds), { padding: [40, 40], maxZoom: 14 });
    }
  }, [stops, organizations, highlightedStopId, L, onOrganizationClick, onStopClick]);

  // Pan to highlighted stop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L || !highlightedStopId) return;

    const marker = markersRef.current.get(`stop-${highlightedStopId}`);
    if (marker) {
      const ll = marker.getLatLng();
      map.setView([ll.lat, ll.lng], 14, { animate: true });
      marker.openPopup();
    }
  }, [highlightedStopId, L]);

  if (!isLoaded) {
    return (
      <div className="w-full bg-slate-100 flex items-center justify-center rounded-lg" style={{ height }}>
        <p className="text-slate-500">{t.tours.loadingMap}</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full rounded-lg" style={{ height }} />;
}
