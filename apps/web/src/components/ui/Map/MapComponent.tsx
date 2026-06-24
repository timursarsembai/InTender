import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  markerPosition?: [number, number] | null;
  onMarkerChange?: (pos: [number, number]) => void;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onMarkerChange }: { onMarkerChange?: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (onMarkerChange) {
        onMarkerChange([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function MapComponent({
  center,
  zoom = 13,
  markerPosition,
  onMarkerChange,
  readOnly = false,
  style,
}: MapProps) {
  return (
    <div
      style={{
        height: '300px',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        position: 'relative',
        zIndex: 0,
        ...style,
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapUpdater center={center} zoom={zoom} />
        {!readOnly && <MapEvents onMarkerChange={onMarkerChange} />}
        {markerPosition && <Marker position={markerPosition} />}
      </MapContainer>
    </div>
  );
}
