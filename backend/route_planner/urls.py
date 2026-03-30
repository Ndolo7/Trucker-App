from django.urls import path
from .views import home, calculate_route, get_trips
from . import views

urlpatterns = [
    path('', home, name='home'),
    path('calculate-route/', calculate_route, name='calculate-route'),
    path('trips/', views.TripListView.as_view(), name='trip-list'),
    path('trips/<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('trip/', get_trips, name='trip'),
]


