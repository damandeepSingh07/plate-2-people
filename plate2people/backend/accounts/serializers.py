from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, NGOVolunteer


class UserSerializer(serializers.ModelSerializer):
    # Aliases so frontend code using first_name/last_name still works
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'name', 'first_name', 'last_name', 'email', 'role',
            'phone', 'address', 'organization_name', 'availability',
            'vehicle_type', 'ngo_registration_number', 'ngo_description',
            'beneficiaries_count', 'is_email_verified', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'is_email_verified', 'first_name', 'last_name']

    def get_first_name(self, obj):
        """Return first word of name as first_name for frontend compatibility."""
        parts = (obj.name or '').split()
        return parts[0] if parts else ''

    def get_last_name(self, obj):
        """Return remaining words as last_name for frontend compatibility."""
        parts = (obj.name or '').split()
        return ' '.join(parts[1:]) if len(parts) > 1 else ''


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'name', 'email', 'password', 'role', 'phone', 'address',
            'organization_name', 'availability', 'vehicle_type',
            'ngo_registration_number', 'ngo_description', 'beneficiaries_count',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_role(self, value):
        allowed = ['donor', 'volunteer', 'ngo']
        if value not in allowed:
            raise serializers.ValidationError(f'Role must be one of: {allowed}')
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class NGOVolunteerSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source='volunteer.name', read_only=True)
    volunteer_email = serializers.CharField(source='volunteer.email', read_only=True)
    volunteer_phone = serializers.CharField(source='volunteer.phone', read_only=True)
    volunteer_id = serializers.IntegerField(source='volunteer.id', read_only=True)

    class Meta:
        model = NGOVolunteer
        fields = [
            'id', 'volunteer_id', 'volunteer_name', 'volunteer_email',
            'volunteer_phone', 'volunteer_role', 'notes', 'joined_at', 'is_active',
        ]
        read_only_fields = ['id', 'joined_at', 'volunteer_id', 'volunteer_name',
                            'volunteer_email', 'volunteer_phone']
