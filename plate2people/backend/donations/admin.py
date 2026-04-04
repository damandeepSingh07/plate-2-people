from django.contrib import admin
from .models import Donation, FoodRequest, VolunteerLocation, Payment, DonationItem


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('food_details', 'donor', 'food_type', 'quantity', 'serves', 'status', 'created_at')
    list_filter = ('status', 'food_type')
    search_fields = ('food_details', 'donor__name', 'pickup_location')
    ordering = ('-created_at',)
    raw_id_fields = ('donor', 'volunteer')


@admin.register(FoodRequest)
class FoodRequestAdmin(admin.ModelAdmin):
    list_display = ('ngo', 'donation', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('ngo__name', 'donation__food_details')
    ordering = ('-created_at',)


@admin.register(VolunteerLocation)
class VolunteerLocationAdmin(admin.ModelAdmin):
    list_display = ('volunteer', 'donation', 'latitude', 'longitude', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('volunteer__name',)
    ordering = ('-updated_at',)
    raw_id_fields = ('volunteer', 'donation')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('donor', 'amount', 'currency', 'payment_method', 'status', 'donation_type', 'created_at')
    list_filter = ('status', 'payment_method', 'donation_type', 'created_at')
    search_fields = ('donor__name', 'donor__email', 'transaction_id', 'order_id')
    ordering = ('-created_at',)
    raw_id_fields = ('donor',)
    readonly_fields = ('created_at', 'updated_at', 'completed_at', 'transaction_id', 'order_id', 'signature')


@admin.register(DonationItem)
class DonationItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'item_type', 'donor', 'condition', 'categories', 'status', 'created_at')
    list_filter = ('status', 'item_type', 'condition', 'categories')
    search_fields = ('title', 'description', 'donor__name', 'pickup_location')
    ordering = ('-created_at',)
    raw_id_fields = ('donor', 'volunteer')
    readonly_fields = ('created_at', 'updated_at')
