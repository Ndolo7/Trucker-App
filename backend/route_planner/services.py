import math


def process_route_data(route_data, current_cycle_hours):
    """
    Process pre-computed route data (from the frontend) to determine
    stops and rest periods based on HOS regulations.
    """
    total_distance = route_data['total_distance']
    total_distance_km = route_data.get('total_distance_km', total_distance * 1.60934)
    total_drive_time = route_data['total_drive_time']

    # 30 min break every 8 hours of driving
    required_breaks = math.floor(total_drive_time / 8)

    # 10 hour rest after 11 hours of driving
    required_rest_periods = math.floor(total_drive_time / 11)

    # 70-hour / 8-day cycle check
    remaining_cycle_hours = 70 - current_cycle_hours
    if total_drive_time > remaining_cycle_hours:
        additional = math.ceil((total_drive_time - remaining_cycle_hours) / 70 * 8)
        required_rest_periods += additional

    stops = generate_stops(route_data, required_breaks, required_rest_periods)

    return {
        'totalDistance': total_distance,
        'totalDistanceKm': total_distance_km,
        'totalDriveTime': total_drive_time,
        'requiredBreaks': required_breaks,
        'requiredRestPeriods': required_rest_periods,
        'stops': stops,
        'points': route_data['points'],
    }


def generate_stops(route_data, required_breaks, required_rest_periods):
    """Generate stops with coordinates based on HOS requirements"""
    total_drive_time = route_data['total_drive_time']
    points = route_data['points']

    if len(points) < 2:
        return []

    start_point = points[0]
    end_point = points[-1]

    stops = [{
        'location': start_point['name'],
        'type': 'Pickup',
        'duration': 1,
        'arrivalTime': format_time(8),
        'lat': start_point['lat'],
        'lon': start_point.get('lon', start_point.get('lng')),
    }]

    total_stops = required_breaks + required_rest_periods

    if total_stops > 0:
        for i in range(total_stops):
            position = (i + 1) / (total_stops + 1)

            lat = start_point['lat'] + position * (end_point['lat'] - start_point['lat'])
            lon_start = start_point.get('lon', start_point.get('lng'))
            lon_end = end_point.get('lon', end_point.get('lng'))
            lon = lon_start + position * (lon_end - lon_start)

            stop_type = 'Required Break' if i < required_breaks else 'Required Rest Period'
            duration = 0.5 if i < required_breaks else 10

            stops.append({
                'location': f'Stop {i + 1}',
                'type': stop_type,
                'duration': duration,
                'arrivalTime': format_time(8 + position * total_drive_time),
                'lat': lat,
                'lon': lon,
            })

    stops.append({
        'location': end_point['name'],
        'type': 'Dropoff',
        'duration': 1,
        'arrivalTime': format_time(8 + total_drive_time),
        'lat': end_point['lat'],
        'lon': end_point.get('lon', end_point.get('lng')),
    })

    return stops


def format_time(hours):
    """Format decimal hours to time string"""
    hour = int(hours) % 24
    minute = int((hours - int(hours)) * 60)
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

    total_trip_hours = (
        float(total_drive_time) +
        required_breaks * 0.5 +
        required_rest_periods * 10 +
        2
    )
    total_trip_days = max(1, math.ceil(total_trip_hours / 24))

    log_sheets = []
    for day in range(total_trip_days):
        if day == 0:
            activities = generate_first_day_activities(stops)
        elif day == total_trip_days - 1:
            activities = generate_last_day_activities(stops)
        else:
            activities = generate_middle_day_activities()

        from_location = stops[0]['location'] if day == 0 else 'En route'
        to_location = stops[-1]['location'] if day == total_trip_days - 1 else 'En route'

        log_sheets.append({
            'date': f"Day {day + 1}",
            'from': from_location,
            'to': to_location,
            'totalMiles': str(int(processed_route['totalDistance'] / total_trip_days)),
            'carrier': 'ABC Trucking Co.',
            'activities': activities,
            'remarks': 'Trip started' if day == 0 else 'Trip completed' if day == total_trip_days - 1 else 'En route',
            'shippingDocuments': 'BOL #12345'
        })

    return log_sheets


def generate_first_day_activities(stops):
    return [
        {'status': 'onDuty', 'startTime': '8', 'endTime': '8.5', 'location': stops[0]['location'], 'remarks': 'Pre-trip inspection'},
        {'status': 'driving', 'startTime': '8.5', 'endTime': '10.5', 'location': 'En route to pickup', 'remarks': ''},
        {'status': 'onDuty', 'startTime': '10.5', 'endTime': '11.5', 'location': stops[0]['location'], 'remarks': 'Loading'},
        {'status': 'driving', 'startTime': '11.5', 'endTime': '14', 'location': 'En route', 'remarks': ''},
        {'status': 'offDuty', 'startTime': '14', 'endTime': '14.5', 'location': 'Rest area', 'remarks': '30-minute break'},
        {'status': 'driving', 'startTime': '14.5', 'endTime': '19.5', 'location': 'En route', 'remarks': ''},
        {'status': 'sleeperBerth', 'startTime': '19.5', 'endTime': '24', 'location': 'Truck stop', 'remarks': 'Rest period'},
    ]


def generate_last_day_activities(stops):
    return [
        {'status': 'sleeperBerth', 'startTime': '0', 'endTime': '5.5', 'location': 'Truck stop', 'remarks': 'Rest period continued'},
        {'status': 'driving', 'startTime': '5.5', 'endTime': '9.5', 'location': 'En route to delivery', 'remarks': ''},
        {'status': 'onDuty', 'startTime': '9.5', 'endTime': '10.5', 'location': stops[-1]['location'], 'remarks': 'Unloading'},
        {'status': 'onDuty', 'startTime': '10.5', 'endTime': '11', 'location': stops[-1]['location'], 'remarks': 'Post-trip inspection'},
        {'status': 'offDuty', 'startTime': '11', 'endTime': '24', 'location': 'Off duty', 'remarks': ''},
    ]


def generate_middle_day_activities():
    return [
        {'status': 'sleeperBerth', 'startTime': '0', 'endTime': '5.5', 'location': 'Truck stop', 'remarks': 'Rest period continued'},
        {'status': 'driving', 'startTime': '5.5', 'endTime': '13.5', 'location': 'En route', 'remarks': ''},
        {'status': 'offDuty', 'startTime': '13.5', 'endTime': '14', 'location': 'Rest area', 'remarks': '30-minute break'},
        {'status': 'driving', 'startTime': '14', 'endTime': '19', 'location': 'En route', 'remarks': ''},
        {'status': 'sleeperBerth', 'startTime': '19', 'endTime': '24', 'location': 'Truck stop', 'remarks': 'Rest period'},
    ]
