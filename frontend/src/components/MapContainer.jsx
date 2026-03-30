import React, { useEffect, useRef, useState } from 'react';
import { getNavigatr } from '../lib/api';

// Route colors for alternatives
const routeColors = ['#38bdf8', '#818cf8', '#f59e0b'];

export function RouteMap({ routeData, loading }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const nav = getNavigatr();
    nav.setStyleFromPreset('dark');

    const mapId = 'navigatr-route-map';
    if (!mapRef.current.id) {
       mapRef.current.id = mapId;
    }

    const map = nav.map({
      container: mapRef.current.id,
      center: { lat: 0, lng: 37 },
      zoom: 3
    });

    mapInstance.current = map;

    return () => {
      // Cleanup on unmount
      mapInstance.current = null;
    };
  }, []);

  // Update map when routeData changes
  useEffect(() => {
    if (!mapInstance.current || !routeData) return;
    const map = mapInstance.current;

    // Clear previous markers
    markersRef.current.forEach(m => {
      try { m.remove?.(); } catch (e) {}
    });
    markersRef.current = [];

    // Draw route polylines
    if (routeData.alternatives && routeData.alternatives.length > 0) {
      // Draw all alternatives first (dimmed)
      routeData.alternatives.forEach((alt, i) => {
        if (i === selectedRoute) return;
        map.drawRoute(alt.polyline, {
          color: '#475569',
          weight: 3,
          opacity: 0.4,
        });
      });

      // Draw selected route on top
      const selected = routeData.alternatives[selectedRoute];
      if (selected) {
        map.drawRoute(selected.polyline, {
          color: routeColors[selectedRoute] || routeColors[0],
          weight: 5,
        });
        map.fitRoute(selected.polyline);
      }
    } else if (routeData.primaryRoute) {
      map.drawRoute(routeData.primaryRoute.polyline, {
        color: '#38bdf8',
        weight: 5,
      });
      map.fitRoute(routeData.primaryRoute.polyline);
    }

    // Add markers for stops
    const stops = routeData.stops || [];
    const markerColors = {
      'Pickup': '#22c55e',
      'Dropoff': '#ef4444',
      'Required Break': '#f59e0b',
      'Required Rest Period': '#6366f1',
    };

    stops.forEach(stop => {
      if (!stop || stop.lat == null || stop.lon == null) return;
      const marker = map.addMarker({
        lat: stop.lat,
        lng: stop.lon,
        label: stop.location,
        color: markerColors[stop.type] || '#64748b',
      });
      if (marker) markersRef.current.push(marker);
    });

  }, [routeData, selectedRoute]);

  const toggleFullscreen = () => {
    const wrapper = mapRef.current?.closest('.map-fullscreen-wrapper');
    if (!wrapper) return;

    const next = !isFullscreen;
    setIsFullscreen(next);

    if (next) {
      wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;border-radius:0;';
      mapRef.current.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    } else {
      wrapper.style.cssText = '';
      mapRef.current.style.height = '420px';
      document.body.style.overflow = '';
    }

    // Let Navigatr recalculate size
    setTimeout(() => {
      mapInstance.current?.resize?.();
    }, 150);
  };

  const alternatives = routeData?.alternatives || [];
  const selected = alternatives[selectedRoute];
  const displayDistanceKm = selected?.distance_km ?? routeData?.totalDistanceKm ?? 0;
  const displayDistanceMi = selected?.distance_mi ?? routeData?.totalDistance ?? 0;
  const displayTime = selected?.duration_hrs ?? routeData?.totalDriveTime ?? 0;

  // Removed early return for loading state to prevent unmounting the map DOM node

  return (
    <div className="map-fullscreen-wrapper">
      {/* Map container */}
      <div style={{ position: 'relative' }}>
        <div
          id="navigatr-route-map"
          ref={mapRef}
          className="map-container"
          style={{ height: 420, borderRadius: 12, overflow: 'hidden' }}
        />

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 34, height: 34,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 6, color: '#fff', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>

        {/* Empty state overlay */}
        {!routeData && !loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(11,17,32,0.7)', borderRadius: 12,
            color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>🗺️</span>
            <span>Enter trip details to see route</span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(11,17,32,0.8)', borderRadius: 12,
            color: 'var(--text-primary)', zIndex: 20, pointerEvents: 'none',
          }}>
            <span className="spinner" style={{ borderTopColor: 'var(--accent)', width: 32, height: 32 }} />
            <span style={{ fontWeight: 600 }}>Calculating Route...</span>
          </div>
        )}
      </div>

      {/* Route selector tabs (when alternatives exist) */}
      {alternatives.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '0 8px', flexWrap: 'wrap' }}>
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => setSelectedRoute(i)}
              style={{
                flex: 1, padding: '10px 12px',
                background: i === selectedRoute ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                border: `1px solid ${i === selectedRoute ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 10,
                color: i === selectedRoute ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
                transition: 'all 0.2s ease', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: routeColors[i] || routeColors[0], display: 'inline-block'
                }} />
                Route {i + 1}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {alt.distance_km} km / {alt.distance_mi} mi · {alt.duration_hrs} hrs
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Route stats */}
      {routeData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12, padding: '0 8px' }}>
          {[
            { label: 'Distance', value: `${displayDistanceKm} km`, sub: `${displayDistanceMi} mi`, color: 'var(--accent)' },
            { label: 'Drive Time', value: `${displayTime} hrs`, color: 'var(--info)' },
            { label: 'Breaks', value: routeData.requiredBreaks ?? 0, color: 'var(--warning)' },
            { label: 'Rest Periods', value: routeData.requiredRestPeriods ?? 0, color: 'var(--danger)' },
          ].map((stat, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}