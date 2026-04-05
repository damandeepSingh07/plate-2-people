import random
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPVerification, NGOVolunteer
from .serializers import SignupSerializer, LoginSerializer, UserSerializer, NGOVolunteerSerializer
from .email_service import EmailService

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        # Auto-send OTP after signup
        _send_otp_to_user(user)
        return Response({
            'message': 'Account created! Please verify your email with the OTP sent.',
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'requires_otp': True,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Login successful!',
            'user': UserSerializer(user).data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_detail(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_volunteers(request):
    """List all volunteers — useful for NGOs and admins"""
    volunteers = User.objects.filter(role='volunteer', is_active=True)
    serializer = UserSerializer(volunteers, many=True)
    return Response(serializer.data)


# ─── OTP Views ─────────────────────────────────────────────────────────────────

def _generate_otp():
    return str(random.randint(100000, 999999))


def _send_otp_to_user(user):
    """Internal helper: invalidate old OTPs, create a fresh one, send email."""
    # Invalidate previous unused OTPs
    OTPVerification.objects.filter(user=user, is_used=False).update(is_used=True)

    code = _generate_otp()
    otp = OTPVerification.objects.create(
        user=user,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    # Send email (console backend in dev, SMTP in prod)
    EmailService.send_otp_email(user, code)
    logger.info(f"OTP sent to: {user.email} | Code: {code}")
    return otp


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    Send (or resend) OTP to user's email.
    Body: { "email": "user@example.com" }
    """
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email is required.'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'No account found with this email.'}, status=404)

    if user.is_email_verified:
        return Response({'message': 'Email is already verified.'}, status=200)

    # Rate-limit: allow resend only every 60 seconds
    recent = OTPVerification.objects.filter(
        user=user,
        is_used=False,
        created_at__gte=timezone.now() - timedelta(seconds=60),
    ).first()
    if recent:
        wait = 60 - int((timezone.now() - recent.created_at).total_seconds())
        return Response(
            {'error': f'Please wait {wait}s before requesting a new OTP.'},
            status=429,
        )

    _send_otp_to_user(user)
    return Response({'message': f'OTP sent to {email}. Valid for 5 minutes.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify the 6-digit OTP.
    Body: { "email": "user@example.com", "otp": "123456" }
    """
    email = request.data.get('email', '').strip()
    code = request.data.get('otp', '').strip()

    if not email or not code:
        return Response({'error': 'Email and OTP are required.'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'No account found with this email.'}, status=404)

    # Find the latest valid OTP
    otp = OTPVerification.objects.filter(
        user=user, code=code, is_used=False
    ).order_by('-created_at').first()

    if not otp:
        return Response({'error': 'Invalid OTP. Please check and try again.'}, status=400)

    if otp.is_expired():
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

    success = otp.verify()
    if success:
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Email verified successfully!',
            'user': UserSerializer(user).data,
            'tokens': tokens,
        })

    return Response({'error': 'Verification failed. Please try again.'}, status=400)


# ─── NGO Volunteer Management ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_volunteer_to_ngo(request):
    """
    NGO adds an existing volunteer user to their team.
    Body: { "email": "volunteer@example.com", "volunteer_role": "delivery", "notes": "..." }
    """
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can add volunteers.'}, status=403)

    email = request.data.get('email', '').strip()
    volunteer_role = request.data.get('volunteer_role', 'general')
    notes = request.data.get('notes', '')

    if not email:
        return Response({'error': 'Volunteer email is required.'}, status=400)

    try:
        volunteer = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': f'No user found with email: {email}'}, status=404)

    if volunteer.role not in ('volunteer', 'donor', 'ngo'):
        return Response({'error': 'User not found or not eligible.'}, status=404)

    link, created = NGOVolunteer.objects.get_or_create(
        ngo=request.user,
        volunteer=volunteer,
        defaults={'volunteer_role': volunteer_role, 'notes': notes, 'is_active': True},
    )
    if not created:
        # Re-activate if previously removed
        link.is_active = True
        link.volunteer_role = volunteer_role
        link.notes = notes
        link.save()

    serializer = NGOVolunteerSerializer(link)
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_ngo_volunteers(request):
    """List volunteers linked to the current NGO."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can view their volunteers.'}, status=403)

    links = NGOVolunteer.objects.filter(ngo=request.user, is_active=True).select_related('volunteer')
    serializer = NGOVolunteerSerializer(links, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_ngo_volunteer(request, pk):
    """Update volunteer role/notes within the NGO."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can update volunteers.'}, status=403)

    try:
        link = NGOVolunteer.objects.get(pk=pk, ngo=request.user)
    except NGOVolunteer.DoesNotExist:
        return Response({'error': 'Volunteer link not found.'}, status=404)

    serializer = NGOVolunteerSerializer(link, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_volunteer_from_ngo(request, pk):
    """Soft-delete: deactivate the NGO-volunteer link."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can remove volunteers.'}, status=403)

    try:
        link = NGOVolunteer.objects.get(pk=pk, ngo=request.user)
    except NGOVolunteer.DoesNotExist:
        return Response({'error': 'Volunteer link not found.'}, status=404)

    link.is_active = False
    link.save()
    return Response({'message': 'Volunteer removed from your team.'}, status=200)


# ─── Password Reset Views ─────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """
    Request a password reset email.
    Body: { "email": "user@example.com" }
    """
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    success = EmailService.request_password_reset(email)
    if success:
        return Response({
            'message': 'Password reset link sent to your email. Check your inbox.',
        }, status=status.HTTP_200_OK)
    else:
        # Always return success for security (don't reveal if email exists)
        return Response({
            'message': 'If this email exists in our system, a reset link has been sent.',
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset password using token from email.
    Body: { "token": "token_value", "new_password": "newpass123" }
    """
    token = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not token or not new_password:
        return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    success = EmailService.reset_password_with_token(token, new_password)
    if success:
        return Response({
            'message': 'Password has been reset successfully. You can now log in with your new password.',
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Invalid or expired reset token. Please request a new password reset.',
        }, status=status.HTTP_400_BAD_REQUEST)
