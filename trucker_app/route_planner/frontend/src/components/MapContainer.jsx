import React, { useEffect, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/// Import marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

export function RouteMap({ routeData, loading }) {
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // Center of USA
  const [zoom, setZoom] = useState(4);

  useEffect(() => {
    if (routeData && routeData.points && routeData.points.length > 0) {
      // Ensure we have valid coordinates
      const validPoints = routeData.points.filter(point => 
        point.lat !== undefined && point.lon !== undefined &&
        !isNaN(point.lat) && !isNaN(point.lon)
      );

      if (validPoints.length > 0) {
        const firstPoint = validPoints[0];
        setMapCenter([firstPoint.lat, firstPoint.lon]);
        setZoom(10);
      }
    }
  }, [routeData]);

  if (loading) {
    return <div className="h-[400px] w-full flex items-center justify-center bg-gray-100">
      Loading map...
    </div>;
  }

  if (!routeData || !routeData.points || routeData.points.length === 0) {
    return <div className="h-[400px] w-full flex items-center justify-center bg-gray-100">
      Enter trip details to see route
    </div>;
  }

  // Filter out any invalid coordinates
  const validPoints = routeData.points.filter(point => 
    point.lat !== undefined && point.lon !== undefined &&
    !isNaN(point.lat) && !isNaN(point.lon)
  );

  const routePoints = validPoints.map(point => [point.lat, point.lon]);

  // Filter out any invalid stop coordinates
  const validStops = (routeData.stops || []).filter(stop => 
    stop.lat !== undefined && stop.lon !== undefined &&
    !isNaN(stop.lat) && !isNaN(stop.lon)
  );

  return (
    <div className="h-[400px] w-full">
      <LeafletMapContainer 
        center={mapCenter} 
        zoom={zoom} 
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {routePoints.length >= 2 && (
          <Polyline 
            positions={routePoints} 
            color="blue" 
            weight={3}
            opacity={0.7}
          />
        )}

        {validStops.map((stop, index) => (
          <Marker 
            key={index} 
            position={[stop.lat, stop.lon]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{stop.location}</h3>
                <p className="text-sm">Type: {stop.type}</p>
                <p className="text-sm">Duration: {stop.duration} hours</p>
                <p className="text-sm">Arrival: {stop.arrivalTime}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMapContainer>

      {/* Route Summary */}
      <div className="mt-4 p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold mb-2">Route Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Distance:</span> {routeData.totalDistance} miles
          </div>
          <div>
            <span className="font-medium">Drive Time:</span> {routeData.totalDriveTime} hours
          </div>
          <div>
            <span className="font-medium">Required Breaks:</span> {routeData.requiredBreaks}
          </div>
          <div>
            <span className="font-medium">Rest Periods:</span> {routeData.requiredRestPeriods}
          </div>
        </div>
      </div>
    </div>
  );
}