// This file would normally make actual API calls to your Django backend
// For now, we'll simulate the API responses
import axios from 'axios';



export const calculateRoute = async (tripData) => {
  try {
    const response = await axios.post('http://localhost:8000/calculate-route/', tripData);
    console.log('API Response:', response.data); // Add this for debugging
    return response.data;
  } catch (error) {
    console.error('Error calculating route:', error.response?.data || error);
    throw error;
  }
};
  
  function generateMockRouteData(tripData) {
    // Generate mock route data based on the input
    const { currentLocation, pickupLocation, dropoffLocation, currentCycleHours } = tripData
  
    // Mock total distance based on locations (would be calculated by the backend)
    let totalDistance = 0
    if (currentLocation.includes("Los") && pickupLocation.includes("San")) {
      totalDistance = 380
    } else if (currentLocation.includes("New York") && pickupLocation.includes("Boston")) {
      totalDistance = 215
    } else {
      // Random distance between 200-1000 miles
      totalDistance = Math.floor(Math.random() * 800) + 200
    }
  
    // Calculate drive time (average 55 mph)
    const totalDriveTime = (totalDistance / 55).toFixed(1)
  
    // Calculate required breaks (30 min break every 8 hours of driving)
    const requiredBreaks = Math.floor(totalDriveTime / 8)
  
    // Calculate required rest periods (10 hour rest after 11 hours of driving)
    const requiredRestPeriods = Math.floor(totalDriveTime / 11)
  
    // Generate mock stops
    const stops = []
    let currentDistance = 0
    let currentTime = 0
  
    // Add pickup location
    stops.push({
      location: pickupLocation,
      type: "Pickup",
      duration: 1,
      arrivalTime: "08:00 AM",
    })
  
    // Add fuel stops (every ~500 miles)
    const fuelStops = Math.floor(totalDistance / 500)
    for (let i = 0; i < fuelStops; i++) {
      const distance = Math.min(500, totalDistance - currentDistance)
      currentDistance += distance
      currentTime += distance / 55
  
      stops.push({
        location: `Fuel Stop ${i + 1}`,
        type: "Fueling",
        duration: 0.5,
        arrivalTime: `${Math.floor(8 + currentTime)}:${Math.floor((currentTime % 1) * 60)
          .toString()
          .padStart(2, "0")} ${currentTime + 8 >= 12 ? "PM" : "AM"}`,
      })
    }
  
    // Add required breaks
    for (let i = 0; i < requiredBreaks; i++) {
      currentTime += 8
      stops.push({
        location: `Rest Area ${i + 1}`,
        type: "Required Break",
        duration: 0.5,
        arrivalTime: `${Math.floor(8 + currentTime)}:${Math.floor((currentTime % 1) * 60)
          .toString()
          .padStart(2, "0")} ${currentTime + 8 >= 12 ? "PM" : "AM"}`,
      })
    }
  
    // Add required rest periods
    for (let i = 0; i < requiredRestPeriods; i++) {
      currentTime += 11
      stops.push({
        location: `Rest Stop ${i + 1}`,
        type: "Required Rest Period",
        duration: 10,
        arrivalTime: `${Math.floor(8 + currentTime)}:${Math.floor((currentTime % 1) * 60)
          .toString()
          .padStart(2, "0")} ${currentTime + 8 >= 12 ? "PM" : "AM"}`,
      })
    }
  
    // Add dropoff location
    stops.push({
      location: dropoffLocation,
      type: "Dropoff",
      duration: 1,
      arrivalTime: `${Math.floor(8 + currentTime + totalDriveTime)}:${Math.floor(
        ((currentTime + totalDriveTime) % 1) * 60,
      )
        .toString()
        .padStart(2, "0")} ${currentTime + totalDriveTime + 8 >= 12 ? "PM" : "AM"}`,
    })
  
    // Generate mock points for the map
    const points = [
      { lat: 34.0522, lon: -118.2437, name: currentLocation, type: "start" },
      { lat: 37.7749, lon: -122.4194, name: pickupLocation, type: "pickup" },
      { lat: 39.7392, lon: -104.9903, name: "Rest Stop", type: "rest" },
      { lat: 41.8781, lon: -87.6298, name: dropoffLocation, type: "dropoff" },
    ]
  
    return {
      totalDistance,
      totalDriveTime,
      requiredBreaks,
      requiredRestPeriods,
      stops,
      points,
    }
  }
  
  function generateMockLogSheets(tripData) {
    // Generate mock log sheets based on the route
    const mockRoute = generateMockRouteData(tripData)
    const { totalDriveTime, requiredBreaks, requiredRestPeriods } = mockRoute
  
    // Calculate how many days the trip will take
    const totalTripDays = Math.ceil(
      (Number.parseFloat(totalDriveTime) + requiredBreaks * 0.5 + requiredRestPeriods * 10) / 24,
    )
  
    // Generate a log sheet for each day
    const logSheets = []
  
    for (let day = 0; day < totalTripDays; day++) {
      // Create activities for this day
      const activities = []
      let currentHour = 8 // Start at 8 AM
  
      if (day === 0) {
        // First day starts with pre-trip inspection
        activities.push({
          status: "onDuty",
          startTime: "8",
          endTime: "8.5",
          location: tripData.currentLocation,
          remarks: "Pre-trip inspection",
        })
  
        currentHour = 8.5
  
        // Add driving to pickup
        activities.push({
          status: "driving",
          startTime: "8.5",
          endTime: "10.5",
          location: "En route to pickup",
          remarks: "",
        })
  
        currentHour = 10.5
  
        // Add pickup
        activities.push({
          status: "onDuty",
          startTime: "10.5",
          endTime: "11.5",
          location: tripData.pickupLocation,
          remarks: "Loading",
        })
  
        currentHour = 11.5
  
        // Add more driving
        activities.push({
          status: "driving",
          startTime: "11.5",
          endTime: "14",
          location: "En route",
          remarks: "",
        })
  
        currentHour = 14
  
        // Add break
        activities.push({
          status: "offDuty",
          startTime: "14",
          endTime: "14.5",
          location: "Rest area",
          remarks: "30-minute break",
        })
  
        currentHour = 14.5
  
        // Add more driving
        activities.push({
          status: "driving",
          startTime: "14.5",
          endTime: "19.5",
          location: "En route",
          remarks: "",
        })
  
        currentHour = 19.5
  
        // Add rest period
        activities.push({
          status: "sleeperBerth",
          startTime: "19.5",
          endTime: "24",
          location: "Truck stop",
          remarks: "Rest period",
        })
      } else if (day === totalTripDays - 1) {
        // Last day
  
        // Continue rest period from previous day
        activities.push({
          status: "sleeperBerth",
          startTime: "0",
          endTime: "5.5",
          location: "Truck stop",
          remarks: "Rest period continued",
        })
  
        currentHour = 5.5
  
        // Add driving
        activities.push({
          status: "driving",
          startTime: "5.5",
          endTime: "9.5",
          location: "En route to delivery",
          remarks: "",
        })
  
        currentHour = 9.5
  
        // Add delivery
        activities.push({
          status: "onDuty",
          startTime: "9.5",
          endTime: "10.5",
          location: tripData.dropoffLocation,
          remarks: "Unloading",
        })
  
        currentHour = 10.5
  
        // Add post-trip inspection
        activities.push({
          status: "onDuty",
          startTime: "10.5",
          endTime: "11",
          location: tripData.dropoffLocation,
          remarks: "Post-trip inspection",
        })
  
        currentHour = 11
  
        // Add off duty
        activities.push({
          status: "offDuty",
          startTime: "11",
          endTime: "24",
          location: "Off duty",
          remarks: "",
        })
      } else {
        // Middle days
  
        // Continue rest period from previous day
        activities.push({
          status: "sleeperBerth",
          startTime: "0",
          endTime: "5.5",
          location: "Truck stop",
          remarks: "Rest period continued",
        })
  
        currentHour = 5.5
  
        // Add driving
        activities.push({
          status: "driving",
          startTime: "5.5",
          endTime: "13.5",
          location: "En route",
          remarks: "",
        })
  
        currentHour = 13.5
  
        // Add break
        activities.push({
          status: "offDuty",
          startTime: "13.5",
          endTime: "14",
          location: "Rest area",
          remarks: "30-minute break",
        })
  
        currentHour = 14
  
        // Add more driving
        activities.push({
          status: "driving",
          startTime: "14",
          endTime: "19",
          location: "En route",
          remarks: "",
        })
  
        currentHour = 19
  
        // Add rest period
        activities.push({
          status: "sleeperBerth",
          startTime: "19",
          endTime: "24",
          location: "Truck stop",
          remarks: "Rest period",
        })
      }
  
      logSheets.push({
        date: `Day ${day + 1}`,
        from: day === 0 ? tripData.currentLocation : "En route",
        to: day === totalTripDays - 1 ? tripData.dropoffLocation : "En route",
        totalMiles: Math.floor(mockRoute.totalDistance / totalTripDays),
        carrier: "ABC Trucking Co.",
        activities,
        remarks: day === 0 ? "Trip started" : day === totalTripDays - 1 ? "Trip completed" : "En route",
        shippingDocuments: "BOL #12345",
      })
    }
  
    return logSheets
  }
  
  