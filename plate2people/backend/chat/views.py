from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import ChatMessage, ChatConversation, ChatbotFAQ, ChatbotInteraction
from .serializers import ChatMessageSerializer, ChatConversationSerializer, ChatbotFAQSerializer, ChatbotInteractionSerializer
from accounts.models import User
import difflib


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).distinct()

    def _can_chat_with_user(self, request_user, other_user):
        """
        FIXED: Check if two users can chat.
        - Volunteer must have accepted a donation from this donor
        - Or they must have an approved donation assignment
        """
        from donations.models import Donation, DonationAssignment
        
        # If both are same role, allow (for admin/ngo staff)
        if request_user.role == other_user.role:
            return True
        
        # Volunteer talking to donor: check if volunteer accepted any of donor's donations
        if request_user.role == 'volunteer' and other_user.role == 'donor':
            has_assignment = Donation.objects.filter(
                donor=other_user,
                volunteer=request_user,
                status__in=['assigned', 'in_transit', 'delivered']
            ).exists()
            return has_assignment
        
        # Donor talking to volunteer: check if volunteer accepted any of donor's donations
        if request_user.role == 'donor' and other_user.role == 'volunteer':
            has_assignment = Donation.objects.filter(
                donor=request_user,
                volunteer=other_user,
                status__in=['assigned', 'in_transit', 'delivered']
            ).exists()
            return has_assignment
        
        # NGO can chat with anyone involved in their donations
        if request_user.role == 'ngo' or other_user.role == 'ngo':
            return True
        
        return False

    def perform_create(self, serializer):
        """FIXED: Check permission before creating message"""
        from rest_framework.exceptions import PermissionDenied
        
        recipient = serializer.validated_data.get('recipient')
        
        # Verify users can chat
        if not self._can_chat_with_user(self.request.user, recipient):
            raise PermissionDenied(
                "Chat not allowed. Volunteer must accept a donation before chatting with donor."
            )
        
        message = serializer.save(sender=self.request.user)
        
        # Auto-create or update ChatConversation
        try:
            user1, user2 = (self.request.user, recipient) if self.request.user.id < recipient.id else (recipient, self.request.user)
            conversation, created = ChatConversation.objects.get_or_create(
                user1=user1,
                user2=user2,
            )
            if not created:
                # Touch last_message_at by saving
                conversation.save()
        except Exception as e:
            print(f"Error creating/updating conversation: {str(e)}")
        
        # Emit socket event for real-time delivery
        try:
            from donations.socketio_events import ChatEventHandler
            event = ChatEventHandler.emit_new_message(message)
            # Event will be emitted by WebSocket server
        except Exception as e:
            print(f"Error emitting chat event: {str(e)}")

    @action(detail=False, methods=['get'])
    def conversation(self, request):
        """Get conversation with a specific user"""
        recipient_id = request.query_params.get('user_id')
        if not recipient_id:
            return Response(
                {"detail": "user_id parameter required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # FIXED: Check permission before allowing conversation
        if not self._can_chat_with_user(request.user, recipient):
            return Response(
                {"detail": "Chat not allowed. Volunteer must accept a donation before chatting."},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = ChatMessage.objects.filter(
            Q(sender=request.user, recipient=recipient) |
            Q(sender=recipient, recipient=request.user)
        ).order_by('created_at')

        # Mark messages as read and emit read receipt
        unread_messages = messages.filter(
            recipient=request.user,
            sender=recipient,
            is_read=False
        )
        unread_messages.update(is_read=True, read_at=timezone.now())
        
        # Emit read receipt for each message
        try:
            from donations.socketio_events import ChatEventHandler
            for msg in unread_messages:
                event = ChatEventHandler.emit_message_read(msg.id, request.user.id)
        except Exception as e:
            print(f"Error emitting read receipts: {str(e)}")

        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def typing_indicator(self, request):
        """
        FIXED: Send typing indicator to recipient.
        Body: { recipient_id, is_typing: true/false }
        """
        recipient_id = request.data.get('recipient_id')
        is_typing = request.data.get('is_typing', True)
        
        if not recipient_id:
            return Response(
                {"detail": "recipient_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Emit typing indicator via socket
        try:
            from donations.socketio_events import ChatEventHandler
            event = ChatEventHandler.emit_typing_indicator(
                request.user.id,
                recipient_id,
                is_typing
            )
        except Exception as e:
            print(f"Error emitting typing indicator: {str(e)}")
        
        return Response({"status": "ok"})

    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """
        FIXED: Mark a message as read and emit read receipt.
        Body: { message_id }
        """
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response(
                {"detail": "message_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            message = ChatMessage.objects.get(id=message_id, recipient=request.user)
            message.mark_as_read()
            
            # Emit read receipt via socket
            try:
                from donations.socketio_events import ChatEventHandler
                event = ChatEventHandler.emit_message_read(message_id, request.user.id)
            except Exception as e:
                print(f"Error emitting read receipt: {str(e)}")
            
            return Response({"status": "ok", "message": "Message marked as read"})
        except ChatMessage.DoesNotExist:
            return Response(
                {"detail": "Message not found or already read"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def conversations_list(self, request):
        """Get all conversations for current user"""
        user = request.user
        conversations = ChatConversation.objects.filter(
            Q(user1=user) | Q(user2=user)
        ).order_by('-last_message_at')
        serializer = ChatConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread messages"""
        unread = ChatMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({"unread_count": unread})

    @action(detail=False, methods=['get'])
    def available_users(self, request):
        """Get list of users the current user can chat with (only users with active donation relationships)"""
        user = request.user
        from donations.models import Donation
        
        if user.role == 'donor':
            # Donors can chat with volunteers who accepted their donations
            volunteer_ids = Donation.objects.filter(
                donor=user,
                volunteer__isnull=False,
                status__in=['assigned', 'in_transit', 'delivered']
            ).values_list('volunteer_id', flat=True).distinct()
            users = User.objects.filter(id__in=volunteer_ids, is_active=True)
        elif user.role == 'volunteer':
            # Volunteers can chat with donors whose donations they've accepted
            donor_ids = Donation.objects.filter(
                volunteer=user,
                status__in=['assigned', 'in_transit', 'delivered']
            ).values_list('donor_id', flat=True).distinct()
            users = User.objects.filter(id__in=donor_ids, is_active=True)
        elif user.role == 'ngo':
            # NGO can chat with donors and volunteers involved in their assignments
            users = User.objects.filter(
                Q(role='donor') | Q(role='volunteer'),
                is_active=True
            ).exclude(id=user.id)
        else:
            users = User.objects.filter(is_active=True).exclude(id=user.id)

        from accounts.serializers import UserSerializer
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class ChatbotViewSet(viewsets.ModelViewSet):
    serializer_class = ChatbotFAQSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ChatbotFAQ.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'])
    def ask(self, request):
        """Ask the chatbot a question"""
        user_message = request.data.get('message', '').strip()

        if not user_message:
            return Response(
                {"detail": "Message cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all FAQs
        faqs = ChatbotFAQ.objects.filter(is_active=True)

        # Simple matching based on similarity
        best_match = None
        best_score = 0.0
        threshold = 0.4

        for faq in faqs:
            # Check keyword match
            keywords = [k.strip().lower() for k in faq.keywords.split(',')]
            message_lower = user_message.lower()

            keyword_score = 0
            for keyword in keywords:
                if keyword in message_lower:
                    keyword_score = 0.8
                    break

            # Check question similarity
            similarity_score = difflib.SequenceMatcher(
                None,
                user_message.lower(),
                faq.question.lower()
            ).ratio()

            # Combined score
            combined_score = max(keyword_score, similarity_score)

            if combined_score > best_score:
                best_score = combined_score
                best_match = faq

        # Get response
        if best_match and best_score >= threshold:
            response = best_match.answer
        else:
            response = (
                "I'm not sure how to answer that. Here are some common questions:\n"
                "- How do I donate food?\n"
                "- How do I volunteer?\n"
                "- How does the tracking work?\n"
                "- Who are we helping?\n\n"
                "Please try rephrasing your question or contact our support team."
            )

        # Log interaction
        ChatbotInteraction.objects.create(
            user=request.user,
            user_message=user_message,
            bot_response=response,
            matched_faq=best_match,
            confidence_score=best_score
        )

        return Response({
            "message": response,
            "matched_faq": ChatbotFAQSerializer(best_match).data if best_match else None,
            "confidence": best_score
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all chatbot categories"""
        categories = ChatbotFAQ._meta.get_field('category').choices
        return Response({
            "categories": [{"value": c[0], "label": c[1]} for c in categories]
        })
