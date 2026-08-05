import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Search, X, Loader2, Check, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import './styles/location-picker.css';

declare global {
  interface Window {
    L: any;
  }
}

interface LocationPickerModalProps {
  value: string;
  onSelect: (location: string) => void;
  placeholder?: string;
  buttonClassName?: string;
}

interface SearchResultItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

export function LocationPickerModal({
  value,
  onSelect,
  placeholder,
  buttonClassName,
}: LocationPickerModalProps) {
  const { t } = useTranslation(['settings', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(value || '');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(value || '');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 16.0544, // Default Da Nang, Vietnam
    lng: 108.2022,
  });
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const leafletLoadedRef = useRef<boolean>(false);

  // Dynamic portal positioning calculation
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const modalWidth = 380;
      let left = rect.right - modalWidth;
      if (left < 10) left = 10;
      if (left + modalWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - modalWidth - 10);
      }

      let top = rect.bottom + 8;
      if (top + 430 > window.innerHeight && rect.top - 440 > 0) {
        top = rect.top - 440;
      }

      setPopoverPos({ top, left });
    }
  }, []);

  const handleToggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Update position on open, window resize or scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Sync internal search text when external value changes
  useEffect(() => {
    setSearchText(value || '');
    setSelectedAddress(value || '');
  }, [value]);

  // ESC key listener to auto-close popover
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format address from OSM Nominatim reverse data
  const formatAddress = (data: any): string => {
    if (!data) return '';
    const addr = data.address || {};
    const parts = [];
    if (addr.road) parts.push(addr.road);
    if (addr.suburb || addr.neighbourhood || addr.quarter || addr.district) {
      parts.push(addr.suburb || addr.neighbourhood || addr.quarter || addr.district);
    }
    if (addr.city || addr.town || addr.village || addr.county || addr.city_district) {
      parts.push(addr.city || addr.town || addr.village || addr.county || addr.city_district);
    }
    if (addr.state || addr.province) parts.push(addr.state || addr.province);
    if (addr.country) parts.push(addr.country);

    if (parts.length > 0) {
      return parts.slice(0, 3).join(', ');
    }
    return data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : '';
  };

  // Reverse Geocode (Lat/Lng -> Address string)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi,en' } }
      );
      if (response.ok) {
        const data = await response.json();
        const formatted = formatAddress(data) || data.display_name;
        if (formatted) {
          setSearchText(formatted);
          setSelectedAddress(formatted);
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  }, []);

  // Helper to create 3D location pin marker
  const createCustomPinIcon = useCallback(() => {
    if (!window.L) return null;
    return window.L.divIcon({
      className: 'lpm-custom-leaflet-marker',
      html: `<div class="lpm-pin-wrapper">
        <div class="lpm-pin-shadow"></div>
        <div class="lpm-pin-head">
          <div class="lpm-pin-dot"></div>
        </div>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }, []);

  // Update map position and marker
  const updateMapMarker = useCallback((lat: number, lng: number, triggerReverse = true) => {
    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current && window.L) {
      mapInstanceRef.current.setView([lat, lng], 14);
      const customPin = createCustomPinIcon();
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      } else {
        markerInstanceRef.current = window.L.marker([lat, lng], {
          draggable: true,
          icon: customPin || undefined,
        }).addTo(mapInstanceRef.current);

        markerInstanceRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          void reverseGeocode(pos.lat, pos.lng);
        });
      }
    }
    if (triggerReverse) {
      void reverseGeocode(lat, lng);
    }
  }, [createCustomPinIcon, reverseGeocode]);

  // Load Leaflet Assets dynamically
  const initLeafletMap = useCallback(() => {
    if (!mapRef.current) return;

    const loadLeafletScript = () => {
      if (window.L) {
        if (!mapInstanceRef.current && mapRef.current) {
          const map = window.L.map(mapRef.current, {
            center: [selectedCoords.lat, selectedCoords.lng],
            zoom: 13,
            zoomControl: false,
          });

          window.L.control.zoom({ position: 'bottomright' }).addTo(map);

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
          }).addTo(map);

          const customIcon = createCustomPinIcon();

          const marker = window.L.marker([selectedCoords.lat, selectedCoords.lng], {
            draggable: true,
            icon: customIcon || undefined,
          }).addTo(map);

          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            setSelectedCoords({ lat: pos.lat, lng: pos.lng });
            void reverseGeocode(pos.lat, pos.lng);
          });

          map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            setSelectedCoords({ lat, lng });
            void reverseGeocode(lat, lng);
          });

          mapInstanceRef.current = map;
          markerInstanceRef.current = marker;
        }
        return;
      }

      // Load CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          leafletLoadedRef.current = true;
          initLeafletMap();
        };
        document.head.appendChild(script);
      }
    };

    loadLeafletScript();
  }, [selectedCoords, reverseGeocode]);

  // Init map when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        initLeafletMap();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    }
  }, [isOpen, initLeafletMap]);

  // Geolocation: My Current Location handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        updateMapMarker(latitude, longitude, true);
        setIsLocating(false);
        toast.success(t('common.locationFound', { defaultValue: 'GPS location detected!' }));
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        toast.error('Could not access current location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search Address handler (Nominatim API)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchText.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchText.trim()
        )}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi,en' } }
      );
      if (response.ok) {
        const data: SearchResultItem[] = await response.json();
        setSearchResults(data);
        if (data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          const formatted = formatAddress(first) || first.display_name;
          setSelectedAddress(formatted);
          updateMapMarker(lat, lng, false);
        } else {
          toast.error('No locations found for this query.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search location.');
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Result Item
  const handleSelectResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const formatted = formatAddress(item) || item.display_name;
    setSearchText(formatted);
    setSelectedAddress(formatted);
    setSearchResults([]);
    updateMapMarker(lat, lng, false);
  };

  // Confirm and Apply Location
  const handleApplyLocation = () => {
    const locationToApply = selectedAddress || searchText;
    if (!locationToApply.trim()) {
      toast.error('Please select or enter a valid location.');
      return;
    }
    onSelect(locationToApply.trim());
    setIsOpen(false);
    toast.success(t('common.locationSelected', { defaultValue: 'Location updated!' }));
  };

  return (
    <>
      {/* Trigger Button - Location Pin Icon */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleOpen}
        title="Open Location Picker Map"
        className={
          buttonClassName ||
          'p-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--brand,#494be7)] hover:bg-[var(--brand-soft)] hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer'
        }
      >
        <MapPin size={18} className="animate-pulse" />
      </button>

      {/* Popover Modal Container rendered via React Portal directly into document.body */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop Layer */}
            <div className="lpm-backdrop animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />

            {/* Popover Card */}
            <div
              ref={popoverRef}
              className="lpm-popover-container animate-in fade-in zoom-in-95 duration-200"
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                zIndex: 999999,
              }}
            >
              {/* Header */}
              <div className="lpm-header">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--brand-soft,#494be715)] text-[var(--brand,#494be7)]">
                    <Globe size={16} />
                  </div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                    {t('settings.locationPickerTitle', { defaultValue: 'Location Map Picker' })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="lpm-body space-y-3">
                {/* Search Input + GPS Button */}
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 relative">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder={placeholder || t('settings.locationPlaceholder', { defaultValue: 'Search city, street or country...' })}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand,#494be7)] transition-all"
                    />
                    {searchText && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setSearchResults([]);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Search Button */}
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isSearching ? <Loader2 size={14} className="animate-spin text-[var(--brand,#494be7)]" /> : 'Search'}
                  </button>

                  {/* My Current Location GPS Button */}
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    title="Get My Current GPS Location"
                    className="px-3 py-2 rounded-xl bg-[var(--brand,#494be7)] text-white text-xs font-extrabold shadow-sm hover:bg-[var(--brand-hover,#3f41d0)] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isLocating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Navigation size={14} className="fill-current" />
                    )}
                    <span>GPS</span>
                  </button>
                </form>

                {/* Search Suggestions Dropdown */}
                {searchResults.length > 0 && (
                  <div className="lpm-suggestions-list">
                    {searchResults.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => handleSelectResult(item)}
                        className="lpm-suggestion-item"
                      >
                        <MapPin size={13} className="text-[var(--brand,#494be7)] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{formatAddress(item) || item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Interactive Map Canvas */}
                <div className="lpm-map-wrapper">
                  <div ref={mapRef} className="lpm-map-canvas" />
                  <div className="lpm-map-badge">
                    <MapPin size={12} className="text-[var(--brand,#494be7)]" />
                    <span className="truncate max-w-[200px]">{selectedAddress || 'Click map to place pin'}</span>
                  </div>
                </div>
              </div>

              {/* Footer - Use Location Button */}
              <div className="lpm-footer">
                <button
                  type="button"
                  onClick={handleApplyLocation}
                  className="w-full py-2.5 rounded-xl bg-[var(--brand,#494be7)] text-white text-xs font-extrabold shadow-md hover:bg-[var(--brand-hover,#3f41d0)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={15} />
                  <span>{t('common.useLocation', { defaultValue: 'Use Selected Location' })}</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
