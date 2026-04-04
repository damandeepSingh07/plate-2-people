from django.urls import path
from . import views

urlpatterns = [
    # ─── DONATION CREATION & MANAGEMENT ───────────────────────────────────────
    path('create/', views.create_donation, name='create-donation'),  # Frontend expects this
    path('donate/', views.create_donation, name='donate'),           # Legacy alias
    path('my-donations/', views.list_donations, name='list-donations'),
    path('available/', views.list_available_donations, name='available-donations'),
    path('my-deliveries/', views.volunteer_my_deliveries, name='volunteer-my-deliveries'),
    path('my-assignments/', views.ngo_my_assignments, name='ngo-my-assignments'),
    path('<int:pk>/', views.donation_detail, name='donation-detail'),
    path('<int:pk>/status/', views.update_donation_status, name='update-donation-status'),
    path('<int:pk>/accept/', views.accept_donation, name='accept-donation'),
    path('<int:pk>/assign/', views.assign_donation, name='assign-donation'),
    path('<int:pk>/delivered/', views.mark_delivered, name='mark-delivered'),
    
    # ── Food Requests ─────────────────────────────────────────────────────────
    path('request/', views.create_request, name='create-request'),
    path('requests/', views.list_requests, name='list-requests'),
    path('requests/<int:pk>/status/', views.update_request_status, name='update-request-status'),
    path('stats/', views.dashboard_stats, name='dashboard-stats'),
    
    # ── Location / Tracking ──────────────────────────────────────────────────
    path('location/update/', views.update_location, name='update-location'),
    path('location/stop/', views.stop_sharing_location, name='stop-location'),
    path('location/volunteers/', views.get_all_active_volunteers, name='active-volunteers'),
    path('tracking/<int:donation_id>/', views.get_donation_tracking, name='donation-tracking'),
    
    # ── REMOVED: Payment URLs (Monetary donations no longer supported) ────────────────────────────────────────────
    
    # ── Non-Food Donation Items ─────────────────────────────────────────────
    path('items/create/', views.create_donation_item, name='create-donation-item'),
    path('items/', views.list_donation_items, name='list-donation-items'),
    path('items/<int:pk>/', views.donation_item_detail, name='donation-item-detail'),
    path('items/<int:pk>/status/', views.update_item_status, name='update-item-status'),
    
    # ── Gamification ─────────────────────────────────────────────────────────
    path('gamification/user-points/', views.get_user_points, name='user-points'),
    path('gamification/badges/', views.get_user_badges, name='user-badges'),
    path('gamification/leaderboard/', views.get_leaderboard, name='leaderboard'),
]
