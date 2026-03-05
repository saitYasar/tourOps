'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { Search, MapPin, X } from 'lucide-react';
import { SprinterLoading } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  centerLat?: number;
  centerLng?: number;
  centerZoom?: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  onAddressChange?: (address: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map with animation
function MapRecenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom || map.getZoom(), {
      duration: 1.5,
    });
  }, [lat, lng, zoom, map]);
  return null;
}

export function LocationPicker({
  initialLat = 41.0082,
  initialLng = 28.9784,
  centerLat,
  centerLng,
  centerZoom,
  onLocationChange,
  onAddressChange,
}: LocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const prevCenterRef = useRef<{ lat?: number; lng?: number }>({});

  // Update map center when centerLat/centerLng props change (e.g., city/district selection)
  useEffect(() => {
    if (centerLat !== undefined && centerLng !== undefined) {
      // Only update if values actually changed from previous props
      if (centerLat !== prevCenterRef.current.lat || centerLng !== prevCenterRef.current.lng) {
        prevCenterRef.current = { lat: centerLat, lng: centerLng };
        setMapCenter({ lat: centerLat, lng: centerLng });
        setMapZoom(centerZoom);
      }
    }
  }, [centerLat, centerLng, centerZoom]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  // Reverse geocoding - get address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'tr',
          },
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setCurrentAddress(data.display_name);
        onAddressChange?.(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }, [onAddressChange]);

  // Handle location selection
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
    setMapCenter({ lat, lng });
    onLocationChange(lat, lng);
    reverseGeocode(lat, lng);
  }, [onLocationChange, reverseGeocode]);

  // Search for address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=tr`,
        {
          headers: {
            'Accept-Language': 'tr',
          },
        }
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search result selection
  const handleResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition({ lat, lng });
    setMapCenter({ lat, lng });
    setCurrentAddress(result.display_name);
    setSearchQuery(result.display_name);
    setShowResults(false);
    onLocationChange(lat, lng, result.display_name);
    onAddressChange?.(result.display_name);
  };

  // Handle Enter key in search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Adres ara... (örn: Beşiktaş, İstanbul)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <SprinterLoading size="xs" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0 flex items-start gap-3"
              >
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          style={{ height: '300px', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[position.lat, position.lng]} icon={defaultIcon} />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <MapRecenter lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} />
        </MapContainer>

        {/* Coordinates Display */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-xs text-slate-600">
          <span className="font-medium">Enlem:</span> {position.lat.toFixed(6)} | <span className="font-medium">Boylam:</span> {position.lng.toFixed(6)}
        </div>
      </div>

      {/* Current Address */}
      {currentAddress && (
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
          <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600">{currentAddress}</p>
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-slate-500">
        Haritaya tıklayarak veya adres arayarak konum seçebilirsiniz
      </p>
    </div>
  );
}
