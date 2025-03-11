from rest_framework import serializers
from .models import Driver, Trip, Stop, LogSheet, LogActivity

class LogActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogActivity
        fields = ['status', 'start_time', 'end_time', 'location', 'remarks']

class LogSheetSerializer(serializers.ModelSerializer):
    activities = LogActivitySerializer(many=True, read_only=True)
    
    class Meta:
        model = LogSheet
        fields = ['date', 'from_location', 'to_location', 'total_miles', 
                  'carrier', 'remarks', 'shipping_documents', 'activities']

class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = ['location', 'stop_type', 'duration', 'arrival_time', 'sequence']

class TripSerializer(serializers.ModelSerializer):
    stops = StopSerializer(many=True, read_only=True)
    log_sheets = LogSheetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = ['id', 'current_location', 'pickup_location', 'dropoff_location', 
                  'current_cycle_hours', 'total_distance', 'total_drive_time', 
                  'created_at', 'stops', 'log_sheets']

class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_hours = serializers.FloatField(min_value=0, max_value=70)