import React, { useState } from 'react';
import { RouteMap } from './components/MapContainer';
import { TripForm } from './components/TripForm';
import { LogSheets } from './components/LogSheets';
import { geocodeLocation, getRoute, calculateHOS } from './lib/api';

function App() {
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [logSheets, setLogSheets] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async (tripData) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Geocode all locations via Navigatr (client-side)
      const [currentGeo, pickupGeo, dropoffGeo] = await Promise.all([
        geocodeLocation(tripData.currentLocation),
        geocodeLocation(tripData.pickupLocation),
        geocodeLocation(tripData.dropoffLocation),
      ]);

      // 2. Get route via Navigatr (client-side)
      const routeResult = await getRoute(
        { lat: currentGeo.lat, lng: currentGeo.lng },
        { lat: dropoffGeo.lat, lng: dropoffGeo.lng },
        { alternates: true }
      );

      // Build alternatives data
      const routes = Array.isArray(routeResult) ? routeResult : [routeResult];
      if (!routes || !routes.length || !routes[0]) {
        throw new Error("No routes could be generated between these locations.");
      }
      const primary = routes[0];
      const distanceKm = (primary.distanceMeters || primary.distance || 0) / 1000;
      const distanceMi = (primary.distanceMeters || primary.distance || 0) / 1609.34;
      const durationHrs = (primary.durationSeconds || primary.duration || 0) / 3600;

      const alternatives = routes.map((r, i) => ({
        polyline: r.polyline,
        distance_km: Math.round(((r.distanceMeters || r.distance || 0) / 1000) * 100) / 100,
        distance_mi: Math.round(((r.distanceMeters || r.distance || 0) / 1609.34) * 100) / 100,
        duration_hrs: Math.round(((r.durationSeconds || r.duration || 0) / 3600) * 100) / 100,
        label: `Route ${i + 1}`,
      }));

      const points = [
        { lat: currentGeo.lat, lon: currentGeo.lng, name: tripData.currentLocation, type: 'start' },
        { lat: pickupGeo.lat, lon: pickupGeo.lng, name: tripData.pickupLocation, type: 'pickup' },
        { lat: dropoffGeo.lat, lon: dropoffGeo.lng, name: tripData.dropoffLocation, type: 'dropoff' },
      ];

      // 3. Send computed data to backend for HOS / ELD only
      const hosData = await calculateHOS({
        current_location: tripData.currentLocation,
        pickup_location: tripData.pickupLocation,
        dropoff_location: tripData.dropoffLocation,
        current_cycle_hours: parseFloat(tripData.currentCycleHours),
        total_distance: Math.round(distanceMi * 100) / 100,
        total_distance_km: Math.round(distanceKm * 100) / 100,
        total_drive_time: Math.round(durationHrs * 100) / 100,
        points,
      });

      // 4. Merge route visuals with HOS data
      setRouteData({
        ...hosData.route,
        primaryRoute: primary,
        alternatives,
      });
      setLogSheets(hosData.logSheets);
    } catch (err) {
      console.error("Failed to calculate route:", err);
      const msg = err.response?.data?.error || err.message || "Failed to calculate route.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent), #818cf8)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem'
          }}>🚛</div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              TruckRoute<span style={{ color: 'var(--accent)' }}>Pro</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Route Planner & ELD Logger</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '4px 10px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--success)',
            borderRadius: 20, fontSize: '0.7rem', fontWeight: 600
          }}>● Online</span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {error && (
          <div style={{
            padding: '12px 20px', marginBottom: 20,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12, color: '#fca5a5', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            ⚠️ {error}
            <button onClick={() => setError(null)} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#fca5a5', cursor: 'pointer', fontSize: '1rem'
            }}>✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="section-title">Trip Details</div>
            <TripForm onSubmit={handleSubmit} isLoading={loading} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0' }}>
              <div className="section-title">
                <span className="icon">🗺️</span>
                Route Map
              </div>
            </div>
            <div style={{ padding: '0 8px 8px' }}>
              <RouteMap routeData={routeData} loading={loading} />
            </div>
          </div>
        </div>

        {logSheets.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="section-title">
              <span className="icon">📋</span>
              ELD Log Sheets
            </div>
            <LogSheets data={logSheets} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;