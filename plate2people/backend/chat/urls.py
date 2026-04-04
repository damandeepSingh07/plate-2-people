from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatMessageViewSet, ChatbotViewSet

router = DefaultRouter()
router.register(r'messages', ChatMessageViewSet, basename='chat-message')
router.register(r'chatbot', ChatbotViewSet, basename='chatbot')

urlpatterns = [
    path('', include(router.urls)),
]
