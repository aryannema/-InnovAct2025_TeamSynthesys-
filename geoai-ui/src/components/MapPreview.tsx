"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons when bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapPreview({
  lat,
  lon,
  radiusM = 500,
  height = 320,
}: {
  lat: number;
  lon: number;
  radiusM?: number;
  height?: number;
}) {
  // Must have height, or you’ll see nothing
  return (
    <div className="rounded-2xl overflow-hidden border">
      <MapContainer
        center={[lat, lon]}
        zoom={15}
        style={{ height, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} />
        <Circle center={[lat, lon]} radius={radiusM} />
      </MapContainer>
    </div>
  );
}
