import React, { useState } from "react";

// Simple Button component
const Button = ({ children, onClick, type = "button", disabled = false, className = "" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
};

// Simple Input component
const Input = ({ id, name, type = "text", placeholder, value, onChange, required = false }) => {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};

// Simple Label component
const Label = ({ htmlFor, children }) => {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
};

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="currentLocation">Current Location</Label>
        <Input
          id="currentLocation"
          name="currentLocation"
          placeholder="City, State or Address"
          value={formData.currentLocation}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="pickupLocation">Pickup Location</Label>
        <Input
          id="pickupLocation"
          name="pickupLocation"
          placeholder="City, State or Address"
          value={formData.pickupLocation}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="dropoffLocation">Dropoff Location</Label>
        <Input
          id="dropoffLocation"
          name="dropoffLocation"
          placeholder="City, State or Address"
          value={formData.dropoffLocation}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="currentCycleHours">Current Cycle Used (Hours)</Label>
        <Input
          id="currentCycleHours"
          name="currentCycleHours"
          type="number"
          placeholder="0"
          value={formData.currentCycleHours}
          onChange={handleChange}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Hours used in current 70hr/8day cycle
        </p>
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Calculating Route..." : "Calculate Route"}
      </Button>
    </form>
  );
}