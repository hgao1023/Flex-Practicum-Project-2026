'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Facility {
  company: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: string;
  is_headquarters: boolean;
}

interface LeafletMapProps {
  facilities: Facility[];
  companyColors: Record<string, string>;
}

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (color: string, isHQ: boolean) => {
  const size = isHQ ? 16 : 12;
  const svgIcon = `
    <svg width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size}" cy="${size}" r="${size - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      ${isHQ ? `<circle cx="${size}" cy="${size}" r="${size / 3}" fill="white"/>` : ''}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size],
  });
};

export default function LeafletMap({ facilities, companyColors }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        scrollWheelZoom: true,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      // Initialize markers layer group
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Clear existing markers
    if (markersRef.current) {
      markersRef.current.clearLayers();
    }

    // Add new markers
    facilities.forEach((facility) => {
      const color = companyColors[facility.company] || '#64748B';
      const icon = createCustomIcon(color, facility.is_headquarters);

      const marker = L.marker([facility.lat, facility.lng], { icon });
      
      // Create popup content
      const popupContent = `
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 24px; height: 24px; border-radius: 6px; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
              ${facility.company.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 600; color: #1e293b;">${facility.company}</div>
              <div style="font-size: 12px; color: #64748b;">${facility.type}</div>
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <div style="font-weight: 500; color: #1e293b;">${facility.city}</div>
            <div style="font-size: 12px; color: #64748b;">${facility.country}</div>
          </div>
          ${facility.is_headquarters ? `
            <div style="margin-top: 8px;">
              <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                Headquarters
              </span>
            </div>
          ` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      if (markersRef.current) {
        markersRef.current.addLayer(marker);
      }
    });

    // Fit bounds if there are facilities
    if (facilities.length > 0) {
      const bounds = L.latLngBounds(facilities.map(f => [f.lat, f.lng]));
      mapRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }

    return () => {
      // Cleanup on unmount
    };
  }, [facilities, companyColors]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-[500px] w-full rounded-xl"
      style={{ zIndex: 0 }}
    />
  );
}
