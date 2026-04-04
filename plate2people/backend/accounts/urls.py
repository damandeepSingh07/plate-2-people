from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── Authentication ──────────────────────────────────────────────────────
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),
    path('user/', views.user_detail, name='user-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # ── OTP Email Verification ───────────────────────────────────────────────
    path('send-otp/', views.send_otp, name='send-otp'),
    path('verify-otp/', views.verify_otp, name='verify-otp'),

    # ── Volunteer listing ────────────────────────────────────────────────────
    path('volunteers/', views.list_volunteers, name='list-volunteers'),

    # ── NGO Volunteer Management ─────────────────────────────────────────────
    path('volunteers/add/', views.add_volunteer_to_ngo, name='ngo-add-volunteer'),
    path('volunteers/my-team/', views.my_ngo_volunteers, name='ngo-my-volunteers'),
    path('volunteers/<int:pk>/update/', views.update_ngo_volunteer, name='ngo-update-volunteer'),
    path('volunteers/<int:pk>/remove/', views.remove_volunteer_from_ngo, name='ngo-remove-volunteer'),
]
