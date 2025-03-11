import React, { useEffect, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

export function RouteMap({ routeData, loading }) {
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    if (routeData && routeData.points && routeData.points.length > 0) {
      const firstPoint = routeData.points[0];
      setMapCenter([firstPoint.lat, firstPoint.lon]);
      setZoom(10);
    }
  }, [routeData]);

  if (loading) {
    return <div>Loading map...</div>;
  }

  if (!routeData || !routeData.points || routeData.points.length === 0) {
    return <div>No route data available</div>;
  }

  const routePoints = routeData.points.map(point => [point.lat, point.lon]);

  return (
    <div className="h-[400px] w-full">
      <LeafletMapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Polyline positions={routePoints} color="blue" />
        {routeData.stops.map((stop, index) => (
          <Marker key={index} position={[stop.lat, stop.lon]}>
            <Popup>
              <div>
                <h3>{stop.location}</h3>
                <p>Type: {stop.type}</p>
                <p>Duration: {stop.duration} hours</p>
                <p>Arrival: {stop.arrivalTime}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMapContainer>
    </div>
  );
}