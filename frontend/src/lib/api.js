import { Navigatr } from '@navigatr/web';
import axios from 'axios';

// ── Navigatr singleton ──
let _nav = null;
export function getNavigatr() {
  if (!_nav) {
    _nav = new Navigatr();
  }
  return _nav;
}

// ── Geocode a location string → { lat, lng } ──
export async function geocodeLocation(address) {
  const nav = getNavigatr();
  // Navigatr geocode takes { address } and returns a single object
  const res = await nav.geocode({ address });
  if (!res || (res.lat == null && res.latitude == null)) {
    throw new Error(`Could not find location: ${address}`);
  }
  // Normalize result keys in case Navigatr uses latitude/longitude instead of lat/lng
  if (res.lat == null && res.latitude != null) res.lat = res.latitude;
  if (res.lng == null && res.longitude != null) res.lng = res.longitude;
  return res; // { lat, lng, displayName, ... }
}

// ── Autocomplete a location string ──
export async function autocompleteLocation(query) {
  const nav = getNavigatr();
  // Returns AutocompleteResult[]
  return await nav.autocomplete({ query, limit: 5 });
}

// ── Get route between origin and destination ──
export async function getRoute(origin, destination, options = {}) {
  const nav = getNavigatr();
  const route = await nav.route({
    origin,
    destination,
    mode: options.mode || 'drive',
    alternates: options.alternates !== false,
  });
  return route;
}

// ── Backend API for HOS / ELD processing ──
const API_BASE = 'http://localhost:8000';

export async function calculateHOS(tripPayload) {
  const response = await axios.post(`${API_BASE}/calculate-route/`, tripPayload);
  return response.data;
}