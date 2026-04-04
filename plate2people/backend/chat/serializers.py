from rest_framework import serializers
from django.db import models
from .models import ChatMessage, ChatConversation, ChatbotFAQ, ChatbotInteraction
from accounts.models import User


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender', 'sender_name', 'sender_email',
            'recipient', 'recipient_name', 'recipient_email',
            'message', 'created_at', 'is_read', 'read_at'
        ]
        read_only_fields = ['created_at', 'read_at']


class ChatConversationSerializer(serializers.ModelSerializer):
    user1_details = UserBasicSerializer(source='user1', read_only=True)
    user2_details = UserBasicSerializer(source='user2', read_only=True)
    latest_messages = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id', 'user1', 'user1_details', 'user2', 'user2_details',
            'created_at', 'last_message_at', 'latest_messages', 'unread_count'
        ]

    def get_latest_messages(self, obj):
        messages = ChatMessage.objects.filter(
            models.Q(sender=obj.user1, recipient=obj.user2) |
            models.Q(sender=obj.user2, recipient=obj.user1)
        ).order_by('-created_at')[:5]
        return ChatMessageSerializer(messages, many=True).data

    def get_unread_count(self, obj):
        current_user = self.context.get('request').user if self.context.get('request') else None
        if not current_user:
            return 0
        return ChatMessage.objects.filter(
            recipient=current_user,
            sender__in=[obj.user1, obj.user2],
            is_read=False
        ).count()


class ChatbotFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotFAQ
        fields = ['id', 'question', 'answer', 'category', 'keywords', 'is_active']


class ChatbotInteractionSerializer(serializers.ModelSerializer):
    faq_detail = ChatbotFAQSerializer(source='matched_faq', read_only=True)

    class Meta:
        model = ChatbotInteraction
        fields = [
            'id', 'user', 'user_message', 'bot_response',
            'matched_faq', 'faq_detail', 'confidence_score', 'created_at'
        ]
        read_only_fields = ['bot_response', 'matched_faq', 'confidence_score', 'created_at']
