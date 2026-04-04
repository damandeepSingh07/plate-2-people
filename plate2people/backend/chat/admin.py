from django.contrib import admin
from .models import ChatMessage, ChatConversation, ChatbotFAQ, ChatbotInteraction


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('sender__email', 'recipient__email', 'message')
    readonly_fields = ('created_at', 'read_at')


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ('user1', 'user2', 'created_at', 'last_message_at')
    list_filter = ('created_at', 'last_message_at')
    search_fields = ('user1__email', 'user2__email')


@admin.register(ChatbotFAQ)
class ChatbotFAQAdmin(admin.ModelAdmin):
    list_display = ('category', 'question', 'is_active', 'created_at')
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('question', 'answer', 'keywords')


@admin.register(ChatbotInteraction)
class ChatbotInteractionAdmin(admin.ModelAdmin):
    list_display = ('user', 'confidence_score', 'created_at', 'matched_faq')
    list_filter = ('confidence_score', 'created_at')
    search_fields = ('user__email', 'user_message', 'bot_response')
    readonly_fields = ('user_message', 'bot_response', 'created_at')
