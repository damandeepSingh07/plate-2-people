from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('donor', 'Donor'),
        ('volunteer', 'Volunteer'),
        ('ngo', 'NGO'),
        ('admin', 'Admin'),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    # Role-specific fields
    # Donor
    organization_name = models.CharField(max_length=255, blank=True)
    # Volunteer
    availability = models.CharField(max_length=255, blank=True)
    vehicle_type = models.CharField(max_length=100, blank=True)
    # NGO
    ngo_registration_number = models.CharField(max_length=100, blank=True)
    ngo_description = models.TextField(blank=True)
    beneficiaries_count = models.PositiveIntegerField(null=True, blank=True)

    # Profile fields
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, max_length=500)
    total_points = models.PositiveIntegerField(default=0)
    is_email_verified = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    class Meta:
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.name} ({self.role})"


class EmailVerification(models.Model):
    """Email verification tokens for signup"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification')
    token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Email verification for {self.user.email}"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def verify(self):
        """Mark email as verified"""
        if not self.is_expired():
            self.is_verified = True
            self.verified_at = timezone.now()
            self.user.is_email_verified = True
            self.save()
            self.user.save()
            return True
        return False


class OTPVerification(models.Model):
    """6-digit OTP for email verification during signup"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_verifications')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()       # 5 minutes from creation
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"OTP for {self.user.email} (used={self.is_used})"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def verify(self):
        """Mark OTP as used and mark user email as verified."""
        if not self.is_expired() and not self.is_used:
            self.is_used = True
            self.used_at = timezone.now()
            self.save()
            self.user.is_email_verified = True
            self.user.save()
            return True
        return False

    class Meta:
        ordering = ['-created_at']


class PasswordReset(models.Model):
    """Password reset tokens"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Password reset for {self.user.email}"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()


class NGOVolunteer(models.Model):
    """Links a volunteer user to an NGO organization"""
    ROLE_CHOICES = [
        ('food_collector', 'Food Collector'),
        ('delivery', 'Delivery'),
        ('admin', 'Admin/Coordinator'),
        ('general', 'General Volunteer'),
    ]

    ngo = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ngo_volunteers',
        limit_choices_to={'role': 'ngo'},
    )
    volunteer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ngo_memberships',
    )
    volunteer_role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='general')
    notes = models.TextField(blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('ngo', 'volunteer')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.volunteer.name} → {self.ngo.name} [{self.volunteer_role}]"
