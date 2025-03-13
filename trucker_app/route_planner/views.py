from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, generics
from .models import Trip, Stop, LogSheet, LogActivity
from .serializers import TripSerializer, TripInputSerializer
import requests
import math
import datetime
import requests
import os
from django.conf import settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add this at the top of the file

api_key = os.getenv('OPENROUTE_API_KEY1')

def get_coordinates(location):
    
    """Get coordinates for a location using OpenRouteService geocoding API"""
    base_url = f"https://api.openrouteservice.org/geocode/search?api_key={api_key}&text={location}"

    params = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
    }
    
    response = requests.get(base_url, params=params)
    data = response.json()
    
    if response.status_code != 200 or not data['features']:
        raise Exception(f"Geocoding failed for location: {location}")
    
    coordinates = data['features'][0]['geometry']['coordinates']
    return coordinates  # [lon, lat]


def calculate_route_with_api(current_location, pickup_location, dropoff_location):
    """Calculate route using OpenRouteService API"""
    base_url = "https://api.openrouteservice.org/v2/directions/driving-car"
    
    # Get coordinates for locations (you might want to implement a geocoding function)
    current_coords = get_coordinates(current_location)
    pickup_coords = get_coordinates(pickup_location)
    dropoff_coords = get_coordinates(dropoff_location)
    
    # Construct the API request
    body = {"coordinates":[[current_coords],[pickup_coords],[dropoff_coords]]}

    params = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        'Authorization': api_key,
        'Content-Type': 'application/json; charset=utf-8'
    }
    
    response = requests.post(base_url, json=body, params=params)
    data = response.json()
    
    if response.status_code != 200:
        raise Exception(f"API request failed: {data.get('error', 'Unknown error')}")
    
    # Extract relevant information from the API response
    route = data['routes'][0]
    total_distance = route['summary']['distance'] / 1609.34  # Convert meters to miles
    total_drive_time = route['summary']['duration'] / 3600  # Convert seconds to hours
    
    # Extract route points
    points = [
        {'lon': coord[0], 'lat': coord[1]} 
        for coord in route['geometry']['coordinates']
    ]
    
    return {
        'total_distance': round(total_distance, 2),
        'total_drive_time': round(total_drive_time, 2),
        'points': points
    }



# Create your views _______________________________________________________________.
def home (request, *args, **kwargs):
    return render(request, 'index.html')
#________________________________________________________________________________


@api_view(['GET'])
def get_trips (request):
    trips = Trip.objects.all()
    serializedData = TripSerializer(trips, many=True).data
    return Response(serializedData)




@api_view(['POST'])
def calculate_route(request):
    """
    Calculate route, stops, and generate ELD logs based on input trip data
    """
    serializer = TripInputSerializer(data=request.data)
    if serializer.is_valid():
        try:
            # Create and save the Trip
            trip = Trip.objects.create(
                current_location=serializer.validated_data['current_location'],
                pickup_location=serializer.validated_data['pickup_location'],
                dropoff_location=serializer.validated_data['dropoff_location'],
                current_cycle_hours=serializer.validated_data['current_cycle_hours']
            )
            # Calculate route using external API
            route_data = calculate_route_with_api(
                trip.current_location, 
                trip.pickup_location, 
                trip.dropoff_location
            )
            
            # Update trip with calculated data
            trip.total_distance = route_data['total_distance']
            trip.total_drive_time = route_data['total_drive_time']
            trip.save()

            # Process route data to determine stops and rest periods
            processed_route = process_route_data(
                route_data, 
                trip.current_cycle_hours
            )

            # Save stops
            for index, stop_data in enumerate(processed_route['stops']):
                Stop.objects.create(
                    trip=trip,
                    location=stop_data['location'],
                    stop_type=stop_data['type'].upper(),
                    duration=stop_data['duration'],
                    arrival_time=stop_data['arrivalTime'],
                    sequence=index
                )

            # Generate and save ELD logs
            log_sheets = generate_eld_logs(processed_route)
            for log_data in log_sheets:
                log_sheet = LogSheet.objects.create(
                    trip=trip,
                    date=log_data['date'],
                    from_location=log_data['from'],
                    to_location=log_data['to'],
                    total_miles=int(float(log_data['totalMiles'])),
                    carrier=log_data['carrier'],
                    remarks=log_data['remarks'],
                    shipping_documents=log_data['shippingDocuments']
                )

                # Save activities for this log sheet
                for activity in log_data['activities']:
                    LogActivity.objects.create(
                        log_sheet=log_sheet,
                        status=activity['status'],
                        start_time=activity['startTime'],
                        end_time=activity['endTime'],
                        location=activity['location'],
                        remarks=activity['remarks']
                    )

            # Return the processed data
            return Response({
                'route': processed_route,
                'logSheets': log_sheets,
                'tripId': trip.id
            })

        except Exception as e:
            # If anything goes wrong, delete the trip and return error
            if 'trip' in locals():
                trip.delete()
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def calculate_route_with_api(current_location, pickup_location, dropoff_location):
    """Calculate route using OpenRouteService API"""
    try:
        # Get coordinates for locations
        current_coords = get_coordinates(current_location)
        pickup_coords = get_coordinates(pickup_location)
        dropoff_coords = get_coordinates(dropoff_location)

        # Ensure we have valid coordinates
        if not all([current_coords, pickup_coords, dropoff_coords]):
            raise ValueError("Could not get valid coordinates for all locations")

        # Generate route points (simplified for example)
        points = [
            {
                'lat': current_coords[1],  # Note: OpenRouteService returns [lon, lat]
                'lon': current_coords[0],
                'name': current_location,
                'type': 'start'
            },
            {
                'lat': pickup_coords[1],
                'lon': pickup_coords[0],
                'name': pickup_location,
                'type': 'pickup'
            },
            {
                'lat': dropoff_coords[1],
                'lon': dropoff_coords[0],
                'name': dropoff_location,
                'type': 'dropoff'
            }
        ]

        # Calculate mock distance and time for now
        total_distance = 473  # This should be calculated from actual coordinates
        total_drive_time = 8.6  # This should be calculated from actual coordinates

        return {
            'total_distance': total_distance,
            'total_drive_time': total_drive_time,
            'points': points
        }

    except Exception as e:
        print(f"Error calculating route: {str(e)}")
        # Return fallback data with valid coordinates
        return {
            'total_distance': 0,
            'total_drive_time': 0,
            'points': [
                {
                    'lat': 39.8283,
                    'lon': -98.5795,
                    'name': 'Default Location',
                    'type': 'start'
                }
            ]
        }

def simulate_distance_calculation(current_location, pickup_location, dropoff_location):
    """Simulate distance calculation between locations"""
    # This is a simplified simulation - in a real app, use a geocoding/routing API
    
    # Check for some known routes for demo purposes
    if 'Los Angeles' in current_location and 'San Francisco' in pickup_location:
        return 380
    elif 'New York' in current_location and 'Boston' in pickup_location:
        return 215
    elif 'Chicago' in current_location and 'Detroit' in pickup_location:
        return 280
    else:
        # Generate a random but reasonable distance
        import random
        return random.randint(200, 1000)

def simulate_route_points(current_location, pickup_location, dropoff_location):
    """Simulate route points for mapping"""
    # This is a simplified simulation - in a real app, use a routing API
    
    # Some hardcoded coordinates for demo purposes
    location_coords = {
        'Los Angeles': (34.0522, -118.2437),
        'San Francisco': (37.7749, -122.4194),
        'New York': (40.7128, -74.0060),
        'Boston': (42.3601, -71.0589),
        'Chicago': (41.8781, -87.6298),
        'Detroit': (42.3314, -83.0458),
        'Dallas': (32.7767, -96.7970),
        'Houston': (29.7604, -95.3698),
        'Miami': (25.7617, -80.1918),
        'Seattle': (47.6062, -122.3321)
    }
    
    # Get coordinates or generate random ones if not in our dictionary
    def get_coords(location):
        for city, coords in location_coords.items():
            if city in location:
                return coords
        # Random coordinates in continental US if not found
        import random
        return (random.uniform(25, 49), random.uniform(-125, -70))
    
    current_coords = get_coords(current_location)
    pickup_coords = get_coords(pickup_location)
    dropoff_coords = get_coords(dropoff_location)
    
    # Create route points
    points = [
        {'lat': current_coords[0], 'lon': current_coords[1], 'name': current_location, 'type': 'start'},
        {'lat': pickup_coords[0], 'lon': pickup_coords[1], 'name': pickup_location, 'type': 'pickup'}
    ]
    
    # Add some intermediate points
    # In a real app, these would come from the routing API
    lat_diff = dropoff_coords[0] - pickup_coords[0]
    lon_diff = dropoff_coords[1] - pickup_coords[1]
    
    # Add 1-3 intermediate points
    import random
    num_points = random.randint(1, 3)
    
    for i in range(num_points):
        factor = (i + 1) / (num_points + 1)
        points.append({
            'lat': pickup_coords[0] + lat_diff * factor,
            'lon': pickup_coords[1] + lon_diff * factor,
            'name': f'Waypoint {i+1}',
            'type': 'waypoint'
        })
    
    # Add dropoff point
    points.append({
        'lat': dropoff_coords[0], 
        'lon': dropoff_coords[1], 
        'name': dropoff_location, 
        'type': 'dropoff'
    })
    
    return points

def process_route_data(route_data, current_cycle_hours):
    """
    Process route data to determine stops and rest periods based on HOS regulations
    """
    total_distance = route_data['total_distance']
    total_drive_time = route_data['total_drive_time']
    
    # Calculate required breaks (30 min break every 8 hours of driving)
    required_breaks = math.floor(total_drive_time / 8)
    
    # Calculate required rest periods (10 hour rest after 11 hours of driving)
    required_rest_periods = math.floor(total_drive_time / 11)
    
    # Calculate remaining hours in the 70-hour cycle
    remaining_cycle_hours = 70 - current_cycle_hours
    
    # Check if additional rest periods are needed due to cycle limitations
    additional_rest_periods = 0
    if total_drive_time > remaining_cycle_hours:
        additional_rest_periods = math.ceil((total_drive_time - remaining_cycle_hours) / 70 * 8)
        required_rest_periods += additional_rest_periods
    
    # Generate stops
    stops = generate_stops(
        route_data, 
        required_breaks, 
        required_rest_periods
    )
    
    # Add the calculated data to the route
    processed_route = {
        'totalDistance': total_distance,
        'totalDriveTime': total_drive_time,
        'requiredBreaks': required_breaks,
        'requiredRestPeriods': required_rest_periods,
        'stops': stops,
        'points': route_data['points']
    }
    
    return processed_route

def generate_stops(route_data, required_breaks, required_rest_periods):
    """Generate stops based on the route and HOS requirements"""
    total_distance = route_data['total_distance']
    total_drive_time = route_data['total_drive_time']
    
    stops = []
    current_distance = 0
    current_time = 0
    
    # Add pickup location as first stop
    stops.append({
        'location': route_data['points'][1]['name'],  # Pickup point
        'type': 'Pickup',
        'duration': 1,
        'arrivalTime': format_time(8)  # Assume starting at 8 AM
    })
    
    # Add fuel stops (every ~500 miles)
    fuel_stops = math.floor(total_distance / 500)
    for i in range(fuel_stops):
        distance = min(500, total_distance - current_distance)
        current_distance += distance
        current_time += distance / 55  # Assuming 55 mph average
        
        stops.append({
            'location': f'Fuel Stop {i+1}',
            'type': 'Fueling',
            'duration': 0.5,
            'arrivalTime': format_time(8 + current_time)
        })
    
    # Reset for calculating breaks and rest periods
    current_distance = 0
    current_time = 0
    
    # Add required breaks
    for i in range(required_breaks):
        current_time += 8  # 8 hours of driving
        
        stops.append({
            'location': f'Rest Area {i+1}',
            'type': 'Required Break',
            'duration': 0.5,
            'arrivalTime': format_time(8 + current_time)
        })
        
        current_time += 0.5  # Add break time
    
    # Add required rest periods
    for i in range(required_rest_periods):
        current_time += 11  # 11 hours of driving
        
        stops.append({
            'location': f'Rest Stop {i+1}',
            'type': 'Required Rest Period',
            'duration': 10,
            'arrivalTime': format_time(8 + current_time)
        })
        
        current_time += 10  # Add rest time
    
    # Add dropoff location as last stop
    stops.append({
        'location': route_data['points'][-1]['name'],  # Dropoff point
        'type': 'Dropoff',
        'duration': 1,
        'arrivalTime': format_time(8 + total_drive_time + 
                                  required_breaks * 0.5 + 
                                  required_rest_periods * 10)
    })
    
    return stops

def format_time(hours):
    """Format decimal hours to time string (e.g., 8.5 -> '8:30 AM')"""
    hour = int(hours)
    minute = int((hours - hour) * 60)
    
    period = 'AM' if hour < 12 else 'PM'
    if hour > 12:
        hour -= 12
    if hour == 0:
        hour = 12
        
    return f"{hour}:{minute:02d} {period}"

def generate_eld_logs(processed_route):
    """Generate ELD log sheets based on the processed route"""
    total_drive_time = processed_route['totalDriveTime']
    required_breaks = processed_route['requiredBreaks']
    required_rest_periods = processed_route['requiredRestPeriods']
    stops = processed_route['stops']
    
    # Calculate how many days the trip will take
    total_trip_hours = (float(total_drive_time) + 
                       required_breaks * 0.5 + 
                       required_rest_periods * 10 + 
                       2)  # 2 hours for pickup and dropoff
    
    total_trip_days = math.ceil(total_trip_hours / 24)
    
    # Generate a log sheet for each day
    log_sheets = []
    
    for day in range(total_trip_days):
        # Create activities for this day
        activities = []
        
        if day == 0:
            # First day
            activities = generate_first_day_activities(stops)
        elif day == total_trip_days - 1:
            # Last day
            activities = generate_last_day_activities(stops)
        else:
            # Middle days
            activities = generate_middle_day_activities()
        
        # Create log sheet
        log_sheet = {
            'date': f"Day {day + 1}",
            'from': stops[0]['location'] if day == 0 else 'En route',
            'to': stops[-1]['location'] if day == total_trip_days - 1 else 'En route',
            'totalMiles': math.floor(processed_route['totalDistance'] / total_trip_days),
            'carrier': 'ABC Trucking Co.',
            'activities': activities,
            'remarks': 'Trip started' if day == 0 else 'Trip completed' if day == total_trip_days - 1 else 'En route',
            'shippingDocuments': 'BOL #12345'
        }
        
        log_sheets.append(log_sheet)
    
    return log_sheets

def generate_first_day_activities(stops):
    """Generate activities for the first day of the trip"""
    activities = [
        {
            'status': 'onDuty',
            'startTime': '8',
            'endTime': '8.5',
            'location': stops[0]['location'],
            'remarks': 'Pre-trip inspection'
        },
        {
            'status': 'driving',
            'startTime': '8.5',
            'endTime': '10.5',
            'location': 'En route to pickup',
            'remarks': ''
        },
        {
            'status': 'onDuty',
            'startTime': '10.5',
            'endTime': '11.5',
            'location': stops[0]['location'],
            'remarks': 'Loading'
        },
        {
            'status': 'driving',
            'startTime': '11.5',
            'endTime': '14',
            'location': 'En route',
            'remarks': ''
        },
        {
            'status': 'offDuty',
            'startTime': '14',
            'endTime': '14.5',
            'location': 'Rest area',
            'remarks': '30-minute break'
        },
        {
            'status': 'driving',
            'startTime': '14.5',
            'endTime': '19.5',
            'location': 'En route',
            'remarks': ''
        },
        {
            'status': 'sleeperBerth',
            'startTime': '19.5',
            'endTime': '24',
            'location': 'Truck stop',
            'remarks': 'Rest period'
        }
    ]
    
    return activities

def generate_last_day_activities(stops):
    """Generate activities for the last day of the trip"""
    activities = [
        {
            'status': 'sleeperBerth',
            'startTime': '0',
            'endTime': '5.5',
            'location': 'Truck stop',
            'remarks': 'Rest period continued'
        },
        {
            'status': 'driving',
            'startTime': '5.5',
            'endTime': '9.5',
            'location': 'En route to delivery',
            'remarks': ''
        },
        {
            'status': 'onDuty',
            'startTime': '9.5',
            'endTime': '10.5',
            'location': stops[-1]['location'],
            'remarks': 'Unloading'
        },
        {
            'status': 'onDuty',
            'startTime': '10.5',
            'endTime': '11',
            'location': stops[-1]['location'],
            'remarks': 'Post-trip inspection'
        },
        {
            'status': 'offDuty',
            'startTime': '11',
            'endTime': '24',
            'location': 'Off duty',
            'remarks': ''
        }
    ]
    
    return activities

def generate_middle_day_activities():
    """Generate activities for middle days of the trip"""
    activities = [
        {
            'status': 'sleeperBerth',
            'startTime': '0',
            'endTime': '5.5',
            'location': 'Truck stop',
            'remarks': 'Rest period continued'
        },
        {
            'status': 'driving',
            'startTime': '5.5',
            'endTime': '13.5',
            'location': 'En route',
            'remarks': ''
        },
        {
            'status': 'offDuty',
            'startTime': '13.5',
            'endTime': '14',
            'location': 'Rest area',
            'remarks': '30-minute break'
        },
        {
            'status': 'driving',
            'startTime': '14',
            'endTime': '19',
            'location': 'En route',
            'remarks': ''
        },
        {
            'status': 'sleeperBerth',
            'startTime': '19',
            'endTime': '24',
            'location': 'Truck stop',
            'remarks': 'Rest period'
        }
    ]
    
    return activities

class TripListView(generics.ListCreateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer

class TripDetailView(generics.RetrieveAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer