from rest_framework import serializers
from .models import Donation, FoodRequest, VolunteerLocation, Payment, DonationItem
from accounts.serializers import UserSerializer


class VolunteerLocationSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source='volunteer.name', read_only=True)

    class Meta:
        model  = VolunteerLocation
        fields = ['id', 'volunteer', 'volunteer_name', 'donation',
                  'latitude', 'longitude', 'heading', 'speed', 'is_active', 'updated_at']
        read_only_fields = ['id', 'volunteer', 'updated_at']


class DonationSerializer(serializers.ModelSerializer):
    donor_name      = serializers.CharField(source='donor.name', read_only=True)
    donor_phone     = serializers.CharField(source='donor.phone', read_only=True)
    volunteer_name  = serializers.CharField(source='volunteer.name', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    food_type_display = serializers.CharField(source='get_food_type_display', read_only=True)
    request_count   = serializers.SerializerMethodField()
    volunteer_location = serializers.SerializerMethodField()
    food_image      = serializers.SerializerMethodField()

    class Meta:
        model  = Donation
        fields = [
            'id', 'donor', 'donor_name', 'donor_phone',
            'volunteer', 'volunteer_name',
            'food_details', 'food_type', 'food_type_display',
            'quantity', 'serves', 'pickup_location',
            'pickup_lat', 'pickup_lng', 'delivery_lat', 'delivery_lng',
            'pickup_time', 'expiry_time', 'status', 'status_display',
            'notes', 'request_count', 'volunteer_location',
            'food_image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'donor', 'created_at', 'updated_at']

    def get_request_count(self, obj):
        return obj.requests.count()

    def get_volunteer_location(self, obj):
        if obj.volunteer_id:
            try:
                loc = VolunteerLocation.objects.get(volunteer_id=obj.volunteer_id, is_active=True)
                return VolunteerLocationSerializer(loc).data
            except VolunteerLocation.DoesNotExist:
                pass
        return None

    def get_food_image(self, obj):
        """Get the URL of the food image if it exists."""
        try:
            if hasattr(obj, 'food_image') and obj.food_image:
                # If food_image is a FoodImage model instance
                if hasattr(obj.food_image, 'image'):
                    return obj.food_image.image.url
                # If it's already a URL string
                return str(obj.food_image)
        except Exception:
            pass
        # Try to get from related FoodImage model
        try:
            from .models import FoodImage
            image = FoodImage.objects.filter(donation=obj).first()
            if image and image.image:
                return image.image.url
        except Exception:
            pass
        return None

    def create(self, validated_data):
        validated_data['donor'] = self.context['request'].user
        return super().create(validated_data)


class FoodRequestSerializer(serializers.ModelSerializer):
    ngo_name = serializers.CharField(source='ngo.name', read_only=True)
    ngo_phone = serializers.CharField(source='ngo.phone', read_only=True)
    donation_details = DonationSerializer(source='donation', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = FoodRequest
        fields = [
            'id', 'ngo', 'ngo_name', 'ngo_phone',
            'donation', 'donation_details',
            'message', 'delivery_address', 'required_by',
            'status', 'status_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'ngo', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['ngo'] = self.context['request'].user
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    donor_email = serializers.CharField(source='donor.email', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'donor', 'donor_name', 'donor_email',
            'amount', 'currency', 'payment_method', 'status',
            'transaction_id', 'order_id', 'signature',
            'donation_type', 'description',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'donor', 'created_at', 'updated_at', 'completed_at']

    def create(self, validated_data):
        validated_data['donor'] = self.context['request'].user
        return super().create(validated_data)


class DonationItemSerializer(serializers.ModelSerializer):
    donor_name = serializers.CharField(source='donor.name', read_only=True)
    donor_phone = serializers.CharField(source='donor.phone', read_only=True)
    volunteer_name = serializers.CharField(source='volunteer.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    categories_display = serializers.CharField(source='get_categories_display', read_only=True)

    class Meta:
        model = DonationItem
        fields = [
            'id', 'donor', 'donor_name', 'donor_phone',
            'volunteer', 'volunteer_name',
            'item_type', 'item_type_display',
            'title', 'description', 'quantity', 'condition', 'condition_display',
            'categories', 'categories_display',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'delivery_lat', 'delivery_lng',
            'pickup_time', 'expiry_date',
            'status', 'status_display', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'donor', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['donor'] = self.context['request'].user
        return super().create(validated_data)
