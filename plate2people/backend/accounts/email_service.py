"""
Email utilities for authentication flows
Email verification and password reset
"""
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.template.loader import render_to_string
from datetime import timedelta
from accounts.models import User, EmailVerification, PasswordReset
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails"""
    
    DEFAULT_FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@plate2people.com')
    FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')

    @staticmethod
    def send_email(subject: str, email: str, template_name: str, context: dict) -> bool:
        """
        Send email using Django's email backend
        
        Args:
            subject: Email subject
            email: Recipient email
            template_name: Template file name (in emails folder)
            context: Context for template rendering
        
        Returns:
            True if sent successfully
        """
        try:
            # For now, use text email. In production, use HTML templates
            message = f"""
{context.get('header', '')}

{context.get('body', '')}

{context.get('footer', 'Thank you!')}
            """

            send_mail(
                subject=subject,
                message=message,
                from_email=EmailService.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info(f"Email sent to {email}: {subject}")
            print(f"[EMAIL] → {email} | Subject: {subject}")  # visible in dev console
            return True
        except Exception as e:
            logger.error(f"Error sending email to {email}: {str(e)}")
            return False

    @staticmethod
    def send_otp_email(user, otp_code: str) -> bool:
        """Send 6-digit OTP for email verification."""
        try:
            context = {
                'header': f'Your Plate2People Verification Code',
                'body': f"""
Hello {user.name},

Your email verification code is:

  ► {otp_code} ◄

This code is valid for 5 minutes. Do not share it with anyone.

If you did not sign up for Plate2People, please ignore this email.
                """,
                'footer': 'Best regards, Plate2People Team'
            }
            result = EmailService.send_email(
                subject='Your Plate2People OTP Code',
                email=user.email,
                template_name='otp_email.html',
                context=context,
            )
            # Always log OTP in dev so it can be tested without real SMTP
            print(f"\n{'='*50}")
            print(f"  OTP for {user.email}: {otp_code}")
            print(f"{'='*50}\n")
            return result
        except Exception as e:
            logger.error(f"Error sending OTP email to {user.email}: {str(e)}")
            return False

    @staticmethod
    def send_verification_email(user: User) -> bool:
        """Send email verification link"""
        try:
            # Create or get verification token
            verification, created = EmailVerification.objects.get_or_create(
                user=user,
                defaults={
                    'expires_at': timezone.now() + timedelta(days=7)
                }
            )
            
            # Generate verification link
            verify_link = f"{EmailService.FRONTEND_URL}/verify-email/{verification.token}"
            
            context = {
                'header': f'Welcome to Plate2People, {user.name}!',
                'body': f'''
Please verify your email address to complete your registration.

Verification Link:
{verify_link}

This link will expire in 7 days.

If you did not sign up for this account, please ignore this email.
                ''',
                'footer': 'Best regards, Plate2People Team'
            }
            
            return EmailService.send_email(
                subject='Verify Your Email - Plate2People',
                email=user.email,
                template_name='verify_email.html',
                context=context
            )
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
            return False

    @staticmethod
    def send_password_reset_email(user: User) -> bool:
        """Send password reset link"""
        try:
            # Create reset token
            reset = PasswordReset.objects.create(
                user=user,
                expires_at=timezone.now() + timedelta(hours=24)
            )
            
            # Generate reset link
            reset_link = f"{EmailService.FRONTEND_URL}/reset-password/{reset.token}"
            
            context = {
                'header': f'Password Reset Request',
                'body': f'''
We received a request to reset your password. Click the link below to create a new password.

Reset Link:
{reset_link}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email and your password will remain unchanged.
                ''',
                'footer': 'Best regards, Plate2People Team'
            }
            
            return EmailService.send_email(
                subject='Reset Your Password - Plate2People',
                email=user.email,
                template_name='reset_password.html',
                context=context
            )
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}")
            return False

    @staticmethod
    def send_donation_confirmation(user: User, donation_details: dict) -> bool:
        """Send donation confirmation email"""
        try:
            context = {
                'header': f'Donation Posted Successfully!',
                'body': f'''
Thank you for your donation! Your food donation has been posted and is now visible to volunteers.

Donation Details:
- Food: {donation_details.get('food_details', 'N/A')}
- Quantity: {donation_details.get('quantity', 'N/A')}
- Pickup Location: {donation_details.get('location', 'N/A')}
- Expiry: {donation_details.get('expiry', 'N/A')}

You can track the status of your donation from your dashboard.
                ''',
                'footer': 'Thank you for making a difference!'
            }
            
            return EmailService.send_email(
                subject='Your Donation Has Been Posted - Plate2People',
                email=user.email,
                template_name='donation_confirmation.html',
                context=context
            )
        except Exception as e:
            logger.error(f"Error sending donation confirmation: {str(e)}")
            return False

    @staticmethod
    def send_delivery_notification(user: User, donation_details: dict) -> bool:
        """Send delivery notification email"""
        try:
            context = {
                'header': f'Delivery Completed!',
                'body': f'''
Great news! Your donation has been successfully delivered.

Donation Details:
- Food: {donation_details.get('food_details', 'N/A')}
- Delivered by: {donation_details.get('volunteer_name', 'A volunteer')}
- Delivered to: {donation_details.get('delivery_location', 'Beneficiaries')}

Thank you for making a positive impact in the community!

Earned Points: +10 donation points
Check your profile to see your updated points and badges.
                ''',
                'footer': 'Keep making a difference!'
            }
            
            return EmailService.send_email(
                subject='Your Donation Has Been Delivered - Plate2People',
                email=user.email,
                template_name='delivery_notification.html',
                context=context
            )
        except Exception as e:
            logger.error(f"Error sending delivery notification: {str(e)}")
            return False

    @staticmethod
    def send_badge_earned_email(user: User, badge_name: str, badge_emoji: str = '') -> bool:
        """Send badge earned notification"""
        try:
            context = {
                'header': f'New Badge Earned! {badge_emoji}',
                'body': f'''
Congratulations! You earned the "{badge_name}" badge for your great contributions to our community.

Keep up the amazing work and earn more badges!

Visit your profile to see all your badges.
                ''',
                'footer': 'Keep making a difference!'
            }
            
            return EmailService.send_email(
                subject=f'Badge Earned: {badge_name} - Plate2People',
                email=user.email,
                template_name='badge_earned.html',
                context=context
            )
        except Exception as e:
            logger.error(f"Error sending badge email: {str(e)}")
            return False


class AuthenticationService:
    """Service for authentication-related operations"""

    @staticmethod
    def verify_email_token(token: str) -> bool:
        """Verify email using token"""
        try:
            verification = EmailVerification.objects.get(token=token)
            
            if verification.is_verified:
                return False  # Already verified
            
            if verification.is_expired():
                return False  # Token expired
            
            return verification.verify()
        except EmailVerification.DoesNotExist:
            return False

    @staticmethod
    def request_password_reset(email: str) -> bool:
        """Request password reset"""
        try:
            user = User.objects.get(email=email)
            return EmailService.send_password_reset_email(user)
        except User.DoesNotExist:
            # Silently fail (security: don't reveal if email exists)
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return False

    @staticmethod
    def reset_password_with_token(token: str, new_password: str) -> bool:
        """Reset password using token"""
        try:
            reset = PasswordReset.objects.get(token=token)
            
            if reset.is_used:
                return False  # Token already used
            
            if reset.is_expired():
                return False  # Token expired
            
            # Update password
            user = reset.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset.mark_as_used()
            
            logger.info(f"Password reset for user: {user.email}")
            return True
        except PasswordReset.DoesNotExist:
            return False
