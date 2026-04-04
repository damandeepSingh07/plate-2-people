from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse


def home(request):
    return HttpResponse(
        """
        <h1>Plate2People API</h1>
        <p>Backend is running; choose an action:</p>
        <ul>
            <li><a href='/admin/'>Django Admin Dashboard</a></li>
            <li>API: Signup (POST only, use frontend or API client)</li>
            <li>API: Login (POST only, use frontend or API client)</li>
            <li><a href='/api/user/'>API: Current user info (GET, auth required)</a></li>
            <li><a href='/api/donations/'>API: Donations list (GET, auth required)</a></li>
        </ul>
        """, content_type='text/html'
    )

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/chat/', include('chat.urls')),
]
