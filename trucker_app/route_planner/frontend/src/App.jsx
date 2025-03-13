import React, { useState } from 'react';
import { RouteMap } from './components/MapContainer';
import { TripForm } from './components/TripForm';
import { LogSheets } from './components/LogSheets';
import { calculateRoute } from './lib/api';

function App() {
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [logSheets, setLogSheets] = useState([]);

  const handleSubmit = async (tripData) => {
    setLoading(true);
    try {
      const data = await calculateRoute({
        current_location: tripData.currentLocation,
        pickup_location: tripData.pickupLocation,
        dropoff_location: tripData.dropoffLocation,
        current_cycle_hours: parseFloat(tripData.currentCycleHours)
      });
      setRouteData(data.route);
      setLogSheets(data.logSheets);
    } catch (error) {
      console.error("Failed to calculate route:", error);
      alert("Failed to calculate route. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-800">
          Trucker Route Planner & ELD Logger
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">Trip Details</h2>
            <TripForm onSubmit={handleSubmit} isLoading={loading} />
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">Route Map</h2>
            <RouteMap routeData={routeData} loading={loading} />
          </div>
        </div>
        
        {logSheets.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">ELD Log Sheets</h2>
            <LogSheets data={logSheets} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;