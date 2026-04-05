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
        Chat permission logic:
        1. Same role users can always chat (donors↔donors, volunteers↔volunteers, etc)
        2. Donors and volunteers CANNOT chat with each other (completely disabled)
        3. NGOs can chat with anyone
        """
        from donations.models import Donation

        # Same role always allowed
        if request_user.role == other_user.role:
            return True

        # Donor-Volunteer chat is completely disabled
        if (request_user.role == 'donor' and other_user.role == 'volunteer') or \
           (request_user.role == 'volunteer' and other_user.role == 'donor'):
            return False

        # NGO side: always allow
        if request_user.role == 'ngo' or other_user.role == 'ngo':
            return True

        return False

        return False

    def perform_create(self, serializer):
        """FIXED: Check permission before creating message"""
        from rest_framework.exceptions import PermissionDenied
        
        recipient = serializer.validated_data.get('recipient')
        
        # Verify users can chat
        if not self._can_chat_with_user(self.request.user, recipient):
            if (self.request.user.role in ['donor', 'volunteer']) and (recipient.role in ['donor', 'volunteer']):
                raise PermissionDenied(
                    "Chat between donors and volunteers is not available. Manage donations through your dashboard instead."
                )
            else:
                raise PermissionDenied(
                    "Chat is not available with this user."
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

        # Check permission
        can_chat = self._can_chat_with_user(request.user, recipient)
        if not can_chat:
            return Response(
                {"detail": "Chat available once a volunteer is assigned to a donation.",
                 "can_chat": False},
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
    def check_permission(self, request):
        """
        Pre-flight check: can current user chat with user_id?
        Returns {can_chat: bool, reason: str}
        """
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'can_chat': False, 'reason': 'user_id required'}, status=400)
        try:
            other = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({'can_chat': False, 'reason': 'User not found'}, status=404)

        can = self._can_chat_with_user(request.user, other)
        if can:
            return Response({'can_chat': True, 'reason': ''})
        else:
            reason = 'Chat is not available with this user.'
            if (request.user.role in ['donor', 'volunteer']) and (other.role in ['donor', 'volunteer']):
                reason = 'Chat between donors and volunteers is not available. Manage donations through your dashboard instead.'
            return Response({'can_chat': can, 'reason': reason})

    @action(detail=False, methods=['get'])
    def poll(self, request):
        """
        Efficient polling endpoint: returns messages since `after_id`.
        GET /api/chat/messages/poll/?user_id=X&after_id=Y
        """
        user_id = request.query_params.get('user_id')
        after_id = request.query_params.get('after_id', 0)
        if not user_id:
            return Response({'detail': 'user_id required'}, status=400)
        try:
            other = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)

        if not self._can_chat_with_user(request.user, other):
            return Response({'can_chat': False, 'messages': [], 'unread': 0})

        qs = ChatMessage.objects.filter(
            Q(sender=request.user, recipient=other) |
            Q(sender=other, recipient=request.user)
        )
        if after_id:
            qs = qs.filter(id__gt=int(after_id))
        qs = qs.order_by('created_at')

        # Mark incoming as read
        qs.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )

        unread_total = ChatMessage.objects.filter(
            recipient=request.user, is_read=False
        ).count()

        serializer = self.get_serializer(qs, many=True)
        return Response({
            'can_chat': True,
            'messages': serializer.data,
            'unread': unread_total,
        })

    @action(detail=False, methods=['get'])
    def available_users(self, request):
        """Get list of users the current user can chat with"""
        user = request.user
        
        if user.role == 'donor':
            # Donors can only chat with other donors
            users = User.objects.filter(role='donor', is_active=True).exclude(id=user.id)
        elif user.role == 'volunteer':
            # Volunteers can only chat with other volunteers
            users = User.objects.filter(role='volunteer', is_active=True).exclude(id=user.id)
        elif user.role == 'ngo':
            # NGO can chat with all active users except themselves
            users = User.objects.filter(is_active=True).exclude(id=user.id)
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
