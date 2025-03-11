from django.urls import path
from .views import home
from . import views

urlpatterns = [
    path('', home, name='home'),
    path('calculate-route/', views.calculate_route, name='calculate-route'),
    path('trips/', views.TripListView.as_view(), name='trip-list'),
    path('trips/<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
]


