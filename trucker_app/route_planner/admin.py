from django.contrib import admin
from .models import Driver, Trip, Stop, LogSheet, LogActivity

class StopInline(admin.TabularInline):
    model = Stop
    extra = 0

class LogActivityInline(admin.TabularInline):
    model = LogActivity
    extra = 0

class LogSheetInline(admin.TabularInline):
    model = LogSheet
    extra = 0

class LogSheetAdmin(admin.ModelAdmin):
    inlines = [LogActivityInline]
    list_display = ['date', 'from_location', 'to_location', 'total_miles']

class TripAdmin(admin.ModelAdmin):
    inlines = [StopInline, LogSheetInline]
    list_display = ['id', 'pickup_location', 'dropoff_location', 'total_distance', 'created_at']

admin.site.register(Driver)
admin.site.register(Trip, TripAdmin)
admin.site.register(LogSheet, LogSheetAdmin)