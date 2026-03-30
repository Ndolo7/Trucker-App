import React, { useState, useEffect, useRef } from "react";
import { autocompleteLocation } from '../lib/api';

function LocationInput({ id, label, icon, placeholder, value, onChange }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const isSelecting = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }
      if (isSelecting.current) {
        isSelecting.current = false;
        return;
      }
      setLoading(true);
      try {
        const results = await autocompleteLocation(query);
        setSuggestions(results || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autocomplete failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 350);
    return () => clearTimeout(timer);
  }, [query, value]);

  const handleSelect = (suggestion) => {
    isSelecting.current = true;
    const parts = [suggestion.name || suggestion.displayName, suggestion.city || suggestion.state, suggestion.country].filter(Boolean);
    // deduplicate parts just in case
    const uniqueParts = [...new Set(parts)];
    const formattedStr = uniqueParts.join(", ");
    
    setQuery(formattedStr);
    onChange({ target: { name: id, value: formattedStr } });
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    onChange(e); // Sync partial input back to parent
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <label className="label" htmlFor={id}>
        {icon} {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={id}
          className="input-field"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          required
          autoComplete="off"
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, border: '2px solid var(--border-color)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
      </div>
      
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 8, marginTop: 4, padding: '4px 0',
          listStyle: 'none', maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
        }}>
          {suggestions.map((s, i) => (
            <li 
              key={i} 
              onClick={() => handleSelect(s)} 
              style={{
                padding: '8px 12px', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {s.name || s.displayName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {[s.city, s.state, s.country].filter(Boolean).join(", ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TripForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    currentLocation: "",
    pickupLocation: "",
    dropoffLocation: "",
    currentCycleHours: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "currentCycleHours" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const fields = [
    { id: "currentLocation", label: "Current Location", icon: "📍", placeholder: "e.g. New York, NY" },
    { id: "pickupLocation", label: "Pickup Location", icon: "🟢", placeholder: "e.g. Philadelphia, PA" },
    { id: "dropoffLocation", label: "Dropoff Location", icon: "🔴", placeholder: "e.g. Washington, DC" },
  ];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map((field) => (
         <LocationInput
            key={field.id}
            id={field.id}
            label={field.label}
            icon={field.icon}
            placeholder={field.placeholder}
            value={formData[field.id]}
            onChange={handleChange}
         />
      ))}

      <div>
        <label className="label" htmlFor="currentCycleHours">
          ⏱️ Current Cycle Used (Hours)
        </label>
        <input
          id="currentCycleHours"
          name="currentCycleHours"
          className="input-field"
          type="number"
          min="0"
          max="70"
          step="0.5"
          placeholder="0"
          value={formData.currentCycleHours}
          onChange={handleChange}
          required
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
          Hours used in current 70hr / 8-day cycle
        </p>
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: 8 }}>
        {isLoading ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Calculating...</> : "Calculate Route"}
      </button>
    </form>
  );
}