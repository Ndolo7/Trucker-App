from django.db import models


class Driver(models.Model):
    name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50)
    
    def __str__(self):
        return self.name

class Trip(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trips')
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_hours = models.FloatField(default=0)
    total_distance = models.FloatField(null=True, blank=True)
    total_drive_time = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Trip from {self.pickup_location} to {self.dropoff_location}"

class Stop(models.Model):
    STOP_TYPES = (
        ('PICKUP', 'Pickup'),
        ('DROPOFF', 'Dropoff'),
        ('FUEL', 'Fueling'),
        ('BREAK', 'Required Break'),
        ('REST', 'Required Rest Period'),
    )
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    location = models.CharField(max_length=255)
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    duration = models.FloatField()  # in hours
    arrival_time = models.CharField(max_length=20)  # stored as string for simplicity
    sequence = models.IntegerField()  # order in the trip
    
    def __str__(self):
        return f"{self.get_stop_type_display()} at {self.location}"

class LogSheet(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='log_sheets')
    date = models.CharField(max_length=50)
    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    total_miles = models.IntegerField()
    carrier = models.CharField(max_length=100)
    remarks = models.TextField(blank=True)
    shipping_documents = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return f"Log Sheet for {self.date}"

class LogActivity(models.Model):
    ACTIVITY_TYPES = (
        ('offDuty', 'Off Duty'),
        ('sleeperBerth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('onDuty', 'On Duty'),
    )
    
    log_sheet = models.ForeignKey(LogSheet, on_delete=models.CASCADE, related_name='activities')
    status = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    start_time = models.CharField(max_length=10)  # stored as string for simplicity (e.g., "8.5")
    end_time = models.CharField(max_length=10)
    location = models.CharField(max_length=255)
    remarks = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.get_status_display()} from {self.start_time} to {self.end_time}"