from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, generics
from .models import Trip, Stop, LogSheet, LogActivity
from .serializers import TripSerializer, TripInputSerializer
import math
import datetime
import json
from django.http import JsonResponse
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

def get_route_path(coordinates_list):
    """Get the actual road path between coordinates using OpenRouteService"""
    
    # Format coordinates for the API request
    formatted_coords = []
    for coords in coordinates_list:
        formatted_coords.append(coords)  # [lon, lat] format
    
    # Make the API request
    url = "https://api.openrouteservice.org/v2/directions/driving-hgv"
    headers = {
        'Authorization': api_key,
        'Content-Type': 'application/json'
    }
    
    body = {
        "coordinates": formatted_coords,
        "format": "geojson"
    }
    
    response = requests.post(url, json=body, headers=headers)
    
    if response.status_code != 200:
        print(f"Error from OpenRouteService: {response.text}")
        raise Exception(f"Failed to get route: {response.status_code}")
    
    data = response.json()
    
    # Extract the route geometry, distance, and duration
    route = data['features'][0]
    geometry = route['geometry']['coordinates']  # Array of [lon, lat] coordinates
    distance = route['properties']['summary']['distance']
    duration = route['properties']['summary']['duration']
    
    return {
        'geometry': geometry,
        'distance': distance,
        'duration': duration
    }


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
    
    route_points = get_route_path([current_coords, pickup_coords, dropoff_coords])
        
    # Create points array with the start, pickup, and dropoff locations
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


    return {
        'total_distance': round(total_distance, 2),
        'total_drive_time': round(total_drive_time, 2),
        'points': points,
        'route_geometry': route_points['geometry']  # This contains the actual road path
    }

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
    
    # Generate stops with coordinates
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




def generate_stops(route_data, required_breaks, required_rest_periods):
    """Generate stops with coordinates based on the route and HOS requirements"""
    total_distance = route_data['total_distance']
    total_drive_time = route_data['total_drive_time']
    points = route_data['points']
    
    # Make sure we have at least start and end points
    if len(points) < 2:
        return []
    
    # Extract start, pickup, and dropoff coordinates
    start_point = points[0]
    end_point = points[-1]
    
    # Calculate intermediate points for breaks and rest periods
    stops = []
    
    # Add pickup location as first stop
    stops.append({
        'location': start_point['name'],
        'type': 'Pickup',
        'duration': 1,
        'arrivalTime': format_time(8),  # Assume starting at 8 AM
        'lat': start_point['lat'],
        'lon': start_point['lon']
    })
    
    # Calculate total number of stops needed
    total_stops = required_breaks + required_rest_periods
    
    # If we need intermediate stops
    if total_stops > 0:
        # Calculate how to distribute stops along the route
        for i in range(total_stops):
            # Calculate position along the route (0 to 1)
            position = (i + 1) / (total_stops + 1)
            
            # Interpolate coordinates between start and end
            lat = start_point['lat'] + position * (end_point['lat'] - start_point['lat'])
            lon = start_point['lon'] + position * (end_point['lon'] - start_point['lon'])
            
            # Determine stop type
            if i < required_breaks:
                stop_type = 'Required Break'
                duration = 0.5
            else:
                stop_type = 'Required Rest Period'
                duration = 10
            
            # Calculate arrival time
            arrival_time = format_time(8 + position * total_drive_time)
            
            stops.append({
                'location': f'Stop {i+1}',
                'type': stop_type,
                'duration': duration,
                'arrivalTime': arrival_time,
                'lat': lat,
                'lon': lon
            })
    
    # Add dropoff location as last stop
    stops.append({
        'location': end_point['name'],
        'type': 'Dropoff',
        'duration': 1,
        'arrivalTime': format_time(8 + total_drive_time),
        'lat': end_point['lat'],
        'lon': end_point['lon']
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
    
    total_trip_days = max(1, math.ceil(total_trip_hours / 24))
    
    # Generate a log sheet for each day
    log_sheets = []
    
    for day in range(total_trip_days):
        # Create activities for this day
        activities = []
        
        if day == 0:
            # First day
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
        elif day == total_trip_days - 1:
            # Last day
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
        else:
            # Middle days
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
        
        # Create log sheet
        from_location = stops[0]['location'] if day == 0 else 'En route'
        to_location = stops[-1]['location'] if day == total_trip_days - 1 else 'En route'
        
        log_sheet = {
            'date': f"Day {day + 1}",
            'from': from_location,
            'to': to_location,
            'totalMiles': str(int(processed_route['totalDistance'] / total_trip_days)),
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