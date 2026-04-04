from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum
import uuid


class Donation(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('requested', 'Requested'),
        ('assigned', 'Assigned'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    FOOD_TYPE_CHOICES = [
        ('cooked', 'Cooked Food'),
        ('raw', 'Raw Ingredients'),
        ('packaged', 'Packaged Food'),
        ('beverages', 'Beverages'),
        ('bakery', 'Bakery Items'),
        ('other', 'Other'),
    ]

    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='donations',
        limit_choices_to={'role': 'donor'}
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_deliveries',
        limit_choices_to={'role': 'volunteer'}
    )

    food_details = models.TextField()
    food_type = models.CharField(max_length=50, choices=FOOD_TYPE_CHOICES, default='other')
    quantity = models.CharField(max_length=100)
    serves = models.PositiveIntegerField(default=1)
    pickup_location = models.TextField()
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    pickup_time = models.DateTimeField(null=True, blank=True)
    expiry_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.food_details[:40]} by {self.donor.name} [{self.status}]"


class FoodRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('fulfilled', 'Fulfilled'),
    ]

    ngo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_requests',
        limit_choices_to={'role': 'ngo'}
    )
    donation = models.ForeignKey(
        Donation,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    message = models.TextField(blank=True)
    delivery_address = models.TextField()
    required_by = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['ngo', 'donation']

    def __str__(self):
        return f"Request by {self.ngo.name} for {self.donation} [{self.status}]"


class VolunteerLocation(models.Model):
    """Stores the last known GPS location of a volunteer during an active delivery."""
    volunteer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location',
        limit_choices_to={'role': 'volunteer'}
    )
    donation = models.ForeignKey(
        Donation,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='volunteer_location'
    )
    latitude  = models.FloatField()
    longitude = models.FloatField()
    heading   = models.FloatField(null=True, blank=True)   # degrees 0-360
    speed     = models.FloatField(null=True, blank=True)   # m/s
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.volunteer.name} @ ({self.latitude:.4f}, {self.longitude:.4f})"


class Payment(models.Model):
    """Online payment model for donations via Razorpay and other gateways"""
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Payment gateway details
    transaction_id = models.CharField(max_length=255, unique=True, blank=True)
    order_id = models.CharField(max_length=255, blank=True)
    signature = models.CharField(max_length=255, blank=True)
    
    # Purpose of donation
    donation_type = models.CharField(
        max_length=20,
        choices=[
            ('food', 'Food Donation'),
            ('supplies', 'Supplies'),
            ('medicine', 'Medicine'),
            ('clothes', 'Clothes'),
            ('general', 'General Fund'),
        ],
        default='food'
    )
    description = models.TextField(blank=True)
    
    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"₹{self.amount} by {self.donor.name} ({self.status})"


class DonationItem(models.Model):
    """Non-food donation items (secondary to food donations)"""
    ITEM_TYPE_CHOICES = [
        ('clothes', 'Clothes'),
        ('medicine', 'Medicine'),
        ('books', 'Books'),
        ('toys', 'Toys'),
        ('utensils', 'Utensils'),
        ('blankets', 'Blankets'),
        ('shoes', 'Shoes'),
        ('hygiene', 'Hygiene Products'),
        ('school_supplies', 'School Supplies'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('available', 'Available'),
        ('requested', 'Requested'),
        ('assigned', 'Assigned'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='donated_items'
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_item_deliveries',
        limit_choices_to={'role': 'volunteer'}
    )

    item_type = models.CharField(max_length=50, choices=ITEM_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    quantity = models.CharField(max_length=100)
    condition = models.CharField(
        max_length=20,
        choices=[
            ('new', 'New'),
            ('excellent', 'Excellent'),
            ('good', 'Good'),
            ('fair', 'Fair'),
        ],
        default='good'
    )
    
    categories = models.CharField(
        max_length=50,
        choices=[
            ('primary', 'Primary Focus - Food'),
            ('secondary', 'Secondary - Clothing & Essentials'),
            ('health', 'Health & Medicine'),
            ('education', 'Education'),
        ],
        default='secondary'
    )

    pickup_location = models.TextField()
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    
    pickup_time = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.item_type}) by {self.donor.name}"


# ==================== NEW MODELS ====================

class FoodImage(models.Model):
    """Food images uploaded by donors (Cloudinary integration)"""
    donation = models.OneToOneField(
        Donation,
        on_delete=models.CASCADE,
        related_name='food_image',
        null=True,
        blank=True
    )
    cloudinary_url = models.URLField()
    public_id = models.CharField(max_length=255, unique=True)
    secure_url = models.URLField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    size_in_bytes = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Food image by {self.uploaded_by.name} - {self.uploaded_at}"


class DonationAssignment(models.Model):
    """Tracks assignment of donations to volunteers through NGOs"""
    STATUS_CHOICES = [
        ('pending', 'Pending Assignment'),
        ('assigned', 'Assigned to Volunteer'),
        ('accepted', 'Accepted by Volunteer'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    DELIVERY_TYPE_CHOICES = [
        ('volunteer', 'Direct to Volunteer'),
        ('ngo', 'Via NGO'),
    ]

    donation = models.OneToOneField(
        Donation,
        on_delete=models.CASCADE,
        related_name='assignment'
    )
    ngo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_donations',
        null=True,
        blank=True,
        limit_choices_to={'role': 'ngo'}
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='volunteer_assignments',
        null=True,
        blank=True,
        limit_choices_to={'role': 'volunteer'}
    )
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES, default='volunteer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    delivery_notes = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Assignment: {self.donation} → {self.volunteer or self.ngo}"


class Point(models.Model):
    """Gamification: Track points earned by users"""
    POINT_TYPE_CHOICES = [
        ('donation', 'Posted Donation'),
        ('donation_with_image', 'Donation with Image'),
        ('delivery', 'Successful Delivery'),
        ('assignment', 'Assignment Completion (NGO)'),
        ('chat_engagement', 'Chat Engagement'),
        ('badge_bonus', 'Badge Bonus'),
        ('leaderboard_bonus', 'Leaderboard Bonus'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='points'
    )
    points_type = models.CharField(max_length=50, choices=POINT_TYPE_CHOICES)
    amount = models.PositiveIntegerField()
    reason = models.TextField()
    
    # Reference to the action
    donation = models.ForeignKey(
        Donation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='points_earned'
    )
    assignment = models.ForeignKey(
        DonationAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='points_earned'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['points_type']),
        ]

    def __str__(self):
        return f"{self.user.name} earned {self.amount} points ({self.points_type})"


class Badge(models.Model):
    """Gamification: Badge definitions"""
    RARITY_CHOICES = [
        ('common', 'Common'),
        ('rare', 'Rare'),
        ('epic', 'Epic'),
        ('legendary', 'Legendary'),
    ]

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    icon_url = models.URLField()
    icon_emoji = models.CharField(max_length=10, blank=True)  # Fallback emoji
    criteria = models.JSONField()  # {type: 'donation_count', value: 10, role: 'donor'}
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='common')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rarity', 'name']

    def __str__(self):
        return f"Badge: {self.name}"


class UserBadge(models.Model):
    """Tracks badges earned by users"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earned_badges'
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'badge')
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.name} earned {self.badge.name}"


class Leaderboard(models.Model):
    """Cached leaderboard data for performance"""
    PERIOD_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('all_time', 'All Time'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leaderboard_entries'
    )
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    role = models.CharField(
        max_length=20,
        choices=[('donor', 'Donor'), ('volunteer', 'Volunteer'), ('ngo', 'NGO')]
    )
    total_points = models.PositiveIntegerField(default=0)
    rank = models.PositiveIntegerField()
    
    # Metadata
    donations_count = models.PositiveIntegerField(default=0)
    deliveries_count = models.PositiveIntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    class Meta:
        unique_together = ('user', 'period', 'role')
        ordering = ['period', 'role', 'rank']

    def __str__(self):
        return f"{self.user.name} - Rank {self.rank} ({self.period})"
