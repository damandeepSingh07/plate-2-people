from django.db import models
from django.conf import settings
from decimal import Decimal


class Payment(models.Model):
    """Payment model for online donations via Razorpay or other gateways"""
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
    order_id = models.CharField(max_length=255, blank=True)  # Razorpay order_id
    signature = models.CharField(max_length=255, blank=True)  # Razorpay signature
    
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
    description = models.TextField(blank=True)  # What the donation is for
    
    # Metadata
    raw_response = models.JSONField(null=True, blank=True)  # Store raw API response
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['donor', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['transaction_id']),
        ]

    def __str__(self):
        return f"₹{self.amount} by {self.donor.name} ({self.status})"

    @property
    def is_successful(self):
        return self.status == 'completed'


class DonationItem(models.Model):
    """Non-food donation items (secondary donations)"""
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
    expiry_date = models.DateTimeField(null=True, blank=True)  # When item expires/is no longer needed
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['volunteer', 'status']),
            models.Index(fields=['item_type']),
        ]

    def __str__(self):
        return f"{self.title} ({self.item_type}) by {self.donor.name}"
