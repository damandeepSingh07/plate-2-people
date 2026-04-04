"""
Socket.io event handlers for real-time updates
Handles orders, chat, locations, and notifications
"""
import json
import logging
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from .models import Donation, DonationAssignment
from chat.models import ChatMessage, ChatConversation
from accounts.models import User

logger = logging.getLogger(__name__)


# ============ SOCKET EVENTS ============

class SocketEventHandler:
    """Handles Socket.io events"""

    # Order/Donation events
    DONATION_CREATED = 'donation:created'
    DONATION_ACCEPTED = 'donation:accepted'
    DONATION_REJECTED = 'donation:rejected'
    DONATION_STATUS_CHANGED = 'donation:status_changed'
    DONATION_ASSIGNED = 'donation:assigned'
    DONATION_DELIVERED = 'donation:delivered'
    VOLUNTEER_ASSIGNED = 'volunteer:assigned'

    # Chat events
    CHAT_MESSAGE = 'chat:message'
    CHAT_TYPING_START = 'chat:typing_start'
    CHAT_TYPING_END = 'chat:typing_end'
    CHAT_MESSAGE_READ = 'chat:message_read'
    CHAT_USER_ONLINE = 'chat:user_online'
    CHAT_USER_OFFLINE = 'chat:user_offline'

    # Location events
    LOCATION_UPDATE = 'location:update'
    VOLUNTEER_LOCATION_UPDATED = 'volunteer:location_updated'

    # Notification events
    NOTIFICATION_BADGE_EARNED = 'notification:badge_earned'
    NOTIFICATION_POINTS_AWARDED = 'notification:points_awarded'
    NOTIFICATION_NEW_MESSAGE = 'notification:new_message'

    # Status events
    # REMOVED: Payment status events (monetary donations no longer supported)
    STATUS_AUCTION_STARTED = 'status:auction_started'  # reserved for future use


class DonationEventHandler:
    """Handles donation-related events"""

    @staticmethod
    def emit_donation_created(donation: Donation):
        """
        Emit event when donation is created
        Broadcast to all connected donors and volunteers
        """
        event_data = {
            'id': donation.id,
            'donor_id': donation.donor.id,
            'donor_name': donation.donor.name,
            'food_details': donation.food_details,
            'food_type': donation.food_type,
            'quantity': donation.quantity,
            'pickup_location': donation.pickup_location,
            'expiry_time': donation.expiry_time.isoformat() if donation.expiry_time else None,
            'status': donation.status,
            'created_at': donation.created_at.isoformat(),
            'has_image': hasattr(donation, 'food_image') and donation.food_image is not None,
        }
        
        # Return event data (actual emission handled by server)
        return {
            'event': SocketEventHandler.DONATION_CREATED,
            'room': 'donations',
            'data': event_data,
            'broadcast': True
        }

    @staticmethod
    def emit_donation_status_changed(donation: Donation):
        """Emit when donation status changes"""
        event_data = {
            'donation_id': donation.id,
            'status': donation.status,
            'volunteer_id': donation.volunteer.id if donation.volunteer else None,
            'volunteer_name': donation.volunteer.name if donation.volunteer else None,
            'updated_at': donation.updated_at.isoformat(),
        }
        
        return {
            'event': SocketEventHandler.DONATION_STATUS_CHANGED,
            'room': f'donation_{donation.id}',
            'data': event_data,
            'broadcast': True
        }

    @staticmethod
    def emit_volunteer_assigned(assignment: DonationAssignment):
        """Emit when volunteer is assigned to donation"""
        event_data = {
            'donation_id': assignment.donation.id,
            'volunteer_id': assignment.volunteer.id,
            'volunteer_name': assignment.volunteer.name,
            'status': assignment.status,
            'assigned_at': assignment.assigned_at.isoformat(),
        }
        
        return {
            'event': SocketEventHandler.VOLUNTEER_ASSIGNED,
            'room': f'donation_{assignment.donation.id}',
            'data': event_data,
            'broadcast': True,
            'send_to': [
                f'donor_{assignment.donation.donor.id}',
                f'volunteer_{assignment.volunteer.id}'
            ]
        }

    @staticmethod
    def emit_donation_delivered(assignment: DonationAssignment):
        """Emit when donation is delivered"""
        event_data = {
            'donation_id': assignment.donation.id,
            'volunteer_id': assignment.volunteer.id,
            'delivered_at': assignment.delivered_at.isoformat(),
            'status': 'delivered',
        }
        
        return {
            'event': SocketEventHandler.DONATION_DELIVERED,
            'room': f'donation_{assignment.donation.id}',
            'data': event_data,
            'broadcast': True,
            'send_to': [
                f'donor_{assignment.donation.donor.id}',
                f'volunteer_{assignment.volunteer.id}'
            ]
        }

    @staticmethod
    def emit_detailed_status_update(donation: Donation):
        """
        ENHANCED: Emit detailed status update with route and timeline info
        for real-time map tracking and notifications
        """
        volunteer_location = None
        if donation.volunteer:
            try:
                from .models import VolunteerLocation
                vol_loc = VolunteerLocation.objects.get(
                    volunteer=donation.volunteer,
                    is_active=True
                )
                volunteer_location = {
                    'latitude': float(vol_loc.latitude),
                    'longitude': float(vol_loc.longitude),
                    'heading': float(vol_loc.heading) if vol_loc.heading else None,
                    'speed': float(vol_loc.speed) if vol_loc.speed else None,
                }
            except:
                pass
        
        event_data = {
            'donation_id': donation.id,
            'status': donation.status,
            'donor_id': donation.donor.id,
            'volunteer_id': donation.volunteer.id if donation.volunteer else None,
            'volunteer_name': donation.volunteer.name if donation.volunteer else None,
            'pickup_coords': {
                'latitude': donation.pickup_lat,
                'longitude': donation.pickup_lng,
            } if donation.pickup_lat and donation.pickup_lng else None,
            'delivery_coords': {
                'latitude': donation.delivery_lat,
                'longitude': donation.delivery_lng,
            } if donation.delivery_lat and donation.delivery_lng else None,
            'volunteer_current_location': volunteer_location,
            'timeline': {
                'created': donation.created_at.isoformat(),
                'scheduled_pickup': donation.pickup_time.isoformat() if donation.pickup_time else None,
                'delivered': donation.delivered_at.isoformat() if hasattr(donation, 'delivered_at') and donation.delivered_at else None,
            },
            'updated_at': donation.updated_at.isoformat(),
        }
        
        return {
            'event': 'donation:detailed_status_update',
            'room': f'donation_{donation.id}',
            'data': event_data,
            'broadcast': True,
            'send_to': [
                f'donor_{donation.donor.id}',
                f'volunteer_{donation.volunteer.id}' if donation.volunteer else None,
            ]
        }


class ChatEventHandler:
    """Handles chat-related events"""

    @staticmethod
    def emit_new_message(message: ChatMessage):
        """Emit new chat message"""
        # Create or get conversation
        if message.sender.id < message.recipient.id:
            conversation_id = f"{message.sender.id}_{message.recipient.id}"
        else:
            conversation_id = f"{message.recipient.id}_{message.sender.id}"
        
        event_data = {
            'message_id': message.id,
            'sender_id': message.sender.id,
            'sender_name': message.sender.name,
            'recipient_id': message.recipient.id,
            'message': message.message,
            'created_at': message.created_at.isoformat(),
            'is_read': message.is_read,
        }
        
        return {
            'event': SocketEventHandler.CHAT_MESSAGE,
            'room': f'chat_{conversation_id}',
            'data': event_data,
            'broadcast': False,
            'send_to': [
                f'user_{message.sender.id}',
                f'user_{message.recipient.id}'
            ]
        }

    @staticmethod
    def emit_typing_indicator(sender_id: int, recipient_id: int, is_typing: bool):
        """Emit typing indicator"""
        if sender_id < recipient_id:
            conversation_id = f"{sender_id}_{recipient_id}"
        else:
            conversation_id = f"{recipient_id}_{sender_id}"
        
        event_data = {
            'user_id': sender_id,
            'is_typing': is_typing,
        }
        
        return {
            'event': SocketEventHandler.CHAT_TYPING_START if is_typing else SocketEventHandler.CHAT_TYPING_END,
            'room': f'chat_{conversation_id}',
            'data': event_data,
            'send_to': [f'user_{recipient_id}']
        }

    @staticmethod
    def emit_message_read(message_id: int, user_id: int):
        """Emit message read receipt"""
        event_data = {
            'message_id': message_id,
            'read_by': user_id,
            'read_at': timezone.now().isoformat(),
        }
        
        return {
            'event': SocketEventHandler.CHAT_MESSAGE_READ,
            'data': event_data,
        }


class LocationEventHandler:
    """Handles location updates"""

    @staticmethod
    def emit_location_update(volunteer_id: int, latitude: float, longitude: float, 
                           donation_id: int = None):
        """Emit volunteer location update"""
        event_data = {
            'volunteer_id': volunteer_id,
            'latitude': latitude,
            'longitude': longitude,
            'donation_id': donation_id,
            'timestamp': timezone.now().isoformat(),
        }
        
        rooms_to_broadcast = [
            f'location_volunteer_{volunteer_id}',
        ]
        
        if donation_id:
            rooms_to_broadcast.append(f'donation_{donation_id}')
        
        return {
            'event': SocketEventHandler.VOLUNTEER_LOCATION_UPDATED,
            'rooms': rooms_to_broadcast,
            'data': event_data,
            'broadcast': True
        }


class NotificationEventHandler:
    """Handles notification events"""

    @staticmethod
    def emit_badge_earned(user_id: int, badge_name: str, badge_emoji: str = ''):
        """Emit badge earned notification"""
        event_data = {
            'badge_name': badge_name,
            'badge_emoji': badge_emoji,
            'earned_at': timezone.now().isoformat(),
        }
        
        return {
            'event': SocketEventHandler.NOTIFICATION_BADGE_EARNED,
            'room': f'user_{user_id}',
            'data': event_data,
            'send_to': [f'user_{user_id}']
        }

    @staticmethod
    def emit_points_awarded(user_id: int, points: int, reason: str = ''):
        """Emit points awarded notification"""
        event_data = {
            'points': points,
            'reason': reason,
            'earned_at': timezone.now().isoformat(),
        }
        
        return {
            'event': SocketEventHandler.NOTIFICATION_POINTS_AWARDED,
            'room': f'user_{user_id}',
            'data': event_data,
            'send_to': [f'user_{user_id}']
        }

    @staticmethod
    def emit_new_message_notification(user_id: int, sender_name: str, message_preview: str):
        """Emit new message notification"""
        event_data = {
            'sender_name': sender_name,
            'preview': message_preview[:100],
            'timestamp': timezone.now().isoformat(),
        }
        
        return {
            'event': SocketEventHandler.NOTIFICATION_NEW_MESSAGE,
            'room': f'user_{user_id}',
            'data': event_data,
            'send_to': [f'user_{user_id}']
        }


# ============ SERVER SETUP HELPERS ============

class SocketIOServerSetup:
    """Helper for setting up Socket.io server (Python)"""
    
    # For Django Channels or python-socketio
    # This provides a reference implementation
    
    @staticmethod
    def get_namespaces():
        """Get all Socket.io namespaces"""
        return [
            '/orders',      # Donation orders
            '/chat',        # Chat messages
            '/location',    # Location tracking
            '/notifications',  # Notifications
            '/payments',    # Payment updates
        ]

    @staticmethod
    def get_rooms_for_user(user_id: int, role: str):
        """Get all rooms a user should join"""
        rooms = [
            f'user_{user_id}',
            'notifications',
        ]
        
        if role == 'donor':
            rooms.append('donors')
            rooms.append(f'donor_{user_id}')
        elif role == 'volunteer':
            rooms.append('volunteers')
            rooms.append(f'volunteer_{user_id}')
        elif role == 'ngo':
            rooms.append('ngos')
            rooms.append(f'ngo_{user_id}')
        
        return rooms

    @staticmethod
    def authenticate_socket_request(token: str) -> dict:
        """Authenticate Socket.io connection with JWT token"""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            try:
                user = User.objects.get(id=user_id)
                return {'authenticated': True, 'user': user}
            except User.DoesNotExist:
                return {'authenticated': False, 'error': 'User not found'}
        except Exception as e:
            logger.error(f"Socket authentication failed: {str(e)}")
            return {'authenticated': False, 'error': str(e)}
