from django.db import models
from django.conf import settings
from django.utils import timezone


class ChatMessage(models.Model):
    """Direct messages between donors and volunteers"""
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"From {self.sender.email} to {self.recipient.email}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class ChatConversation(models.Model):
    """Conversation thread between two users"""
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_user1'
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_user2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user1', 'user2')
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Conversation between {self.user1.email} and {self.user2.email}"


class ChatbotFAQ(models.Model):
    """FAQ for the chatbot"""
    CATEGORY_CHOICES = [
        ('donation', 'How to Donate'),
        ('volunteer', 'How to Volunteer'),
        ('ngo', 'NGO Information'),
        ('process', 'Donation Process'),
        ('tracking', 'Tracking Donation'),
        ('general', 'General Questions'),
        ('technical', 'Technical Support'),
        ('casual', 'Casual Chat'),
        ('funny', 'Funny Questions'),
    ]

    question = models.TextField()
    answer = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    keywords = models.TextField(help_text="Comma-separated keywords for matching")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'question']

    def __str__(self):
        return f"[{self.category}] {self.question[:50]}"


class ChatbotInteraction(models.Model):
    """Logs of chatbot interactions"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chatbot_interactions'
    )
    user_message = models.TextField()
    bot_response = models.TextField()
    matched_faq = models.ForeignKey(
        ChatbotFAQ,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    confidence_score = models.FloatField(default=0.0, help_text="0-1 confidence of match")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Chatbot interaction at {self.created_at}"
