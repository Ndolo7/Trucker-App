from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, generics
from .models import Trip, Stop, LogSheet, LogActivity
from .serializers import TripSerializer, TripInputSerializer
from .services import process_route_data, generate_eld_logs


def home(request, *args, **kwargs):
    return render(request, 'index.html')


@api_view(['GET'])
def get_trips(request):
    trips = Trip.objects.all()
    serializedData = TripSerializer(trips, many=True).data
    return Response(serializedData)


@api_view(['POST'])
def calculate_route(request):
    """
    Accept pre-computed route data from the frontend (via Navigatr SDK),
    process HOS regulations, and generate ELD logs.
    """
    data = request.data

    try:
        # Validate required fields
        required = ['current_location', 'pickup_location', 'dropoff_location',
                     'current_cycle_hours', 'total_distance', 'total_drive_time', 'points']
        for field in required:
            if field not in data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create trip
        trip = Trip.objects.create(
            current_location=data['current_location'],
            pickup_location=data['pickup_location'],
            dropoff_location=data['dropoff_location'],
            current_cycle_hours=float(data['current_cycle_hours'])
        )

        trip.total_distance = float(data['total_distance'])
        trip.total_drive_time = float(data['total_drive_time'])
        trip.save()

        # Build route_data dict for HOS processing
        route_data = {
            'total_distance': float(data['total_distance']),
            'total_distance_km': float(data.get('total_distance_km', data['total_distance'] * 1.60934)),
            'total_drive_time': float(data['total_drive_time']),
            'points': data['points'],
        }

        # Process HOS
        processed_route = process_route_data(route_data, float(data['current_cycle_hours']))

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
            for activity in log_data['activities']:
                LogActivity.objects.create(
                    log_sheet=log_sheet,
                    status=activity['status'],
                    start_time=activity['startTime'],
                    end_time=activity['endTime'],
                    location=activity['location'],
                    remarks=activity['remarks']
                )

        return Response({
            'route': processed_route,
            'logSheets': log_sheets,
            'tripId': trip.id
        })

    except Exception as e:
        if 'trip' in locals():
            trip.delete()
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class TripListView(generics.ListCreateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer


class TripDetailView(generics.RetrieveAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer