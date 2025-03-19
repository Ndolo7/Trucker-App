import React, { useEffect, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Create custom marker icons using SVG
const createCustomIcon = (type) => {
  // SVG icons for different marker types
  const svgIcons = {
    'Pickup': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4CAF50"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    'Dropoff': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F44336"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    'Required Break': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF9800"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    'Required Rest Period': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2196F3"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    'default': `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" stroke-width="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#9E9E9E"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `
  };

  // Get the appropriate SVG based on stop type
  const svgString = svgIcons[type] || svgIcons['default'];
  
  // Create a base64 data URL from the SVG
  const svgBase64 = btoa(svgString);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
  
  // Create the icon
  return new L.Icon({
    iconUrl: dataUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};


const createArrows = (routePath) => {
  if (routePath.length < 2) return [];
  
  const arrows = [];
  // Add an arrow every n points
  const step = Math.max(1, Math.floor(routePath.length / 10));
  
  for (let i = step; i < routePath.length - step; i += step) {
    const p1 = routePath[i - step];
    const p2 = routePath[i + step];
    
    // Calculate angle
    const angle = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * 180 / Math.PI;
    
    arrows.push({
      position: routePath[i],
      angle: angle
    });
  }
  
  return arrows;

}  

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
        setZoom(6);
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

  // Get the route geometry (actual road path)
  const routeGeometry = routeData.route_geometry || [];
  
  // Convert the route geometry from [lon, lat] to [lat, lon] format for Leaflet
  const routePath = routeGeometry.map(point => [point[1], point[0]]);

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
        
        {/* Draw the route with a more distinctive style */}
        {routePath.length > 0 && (
          <>
            {/* Add a wider, semi-transparent background line */}
            <Polyline 
              positions={routePath} 
              color="#FFFFFF" 
              weight={8}
              opacity={0.7}
            />
            {/* Add the main route line on top */}
            <Polyline 
              positions={routePath} 
              color="#3366FF" 
              weight={5}
              opacity={1}
            />
            {/* Add a pulsing animation effect */}
            <Polyline 
              positions={routePath} 
              color="#66B2FF" 
              weight={3}
              opacity={0.8}
              className="route-pulse"
            />
          </>
        )}

        {routePath.length > 0 && createArrows(routePath).map((arrow, index) => (
          <Marker
            key={`arrow-${index}`}
            position={arrow.position}
            icon={L.divIcon({
              html: `<div style="transform: rotate(${arrow.angle}deg);">➤</div>`,
              className: 'route-arrow',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          />
        ))}



        {validStops.map((stop, index) => (
          <Marker 
            key={index} 
            position={[stop.lat, stop.lon]}
            icon={createCustomIcon(stop.type)}
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

      {/* Add CSS for the pulsing effect */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        :global(.route-pulse) {
          animation: pulse 2s infinite;
        }
      `}</style>

      {/* Route Summary   */}
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