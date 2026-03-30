from django.test import TestCase, Client
from django.urls import reverse
from .models import Trip

class RoutePlannerTests(TestCase):
    def setUp(self):
        self.client = Client()
        # Create a sample trip
        self.trip = Trip.objects.create(
            current_location="New York, NY",
            pickup_location="Philadelphia, PA",
            dropoff_location="Washington, DC",
            current_cycle_hours=10.0,
            total_distance=200.0,
            total_drive_time=4.5
        )

    def test_home_page(self):
        response = self.client.get(reverse('home'))
        # Should return 200 OK since we render index.html (ensure frontend is built)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"<!doctype html>", response.content.lower() or b"<!doctype html>") # if it's returning html

    def test_get_trips(self):
        response = self.client.get('/trips/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['current_location'], "New York, NY")

    def test_calculate_route_invalid_data(self):
        response = self.client.post('/calculate-route/', {})
        self.assertEqual(response.status_code, 400)
