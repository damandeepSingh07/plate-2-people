"""
Payment handler for Razorpay integration
Webhook processing and transaction verification
"""
import hashlib
import hmac
import logging
from django.conf import settings
from django.utils import timezone
from .models import Payment, Donation
from accounts.models import User
import razorpay

logger = logging.getLogger(__name__)


class RazorpayHandler:
    """Handles Razorpay payment processing"""

    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(self, amount: float, currency: str = 'INR', notes: dict = None) -> dict:
        """
        Create a Razorpay order
        
        Args:
            amount: Amount in paise (smallest unit)
            currency: Currency code
            notes: Additional notes for the order
        
        Returns:
            Order details from Razorpay
        """
        try:
            order_data = {
                'amount': int(amount * 100),  # Convert to paise
                'currency': currency,
                'receipt': f'order_{timezone.now().timestamp()}',
                'notes': notes or {}
            }
            
            order = self.client.order.create(data=order_data)
            logger.info(f"Razorpay order created: {order['id']}")
            return order
        except Exception as e:
            logger.error(f"Error creating Razorpay order: {str(e)}")
            raise

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verify payment signature from Razorpay callback
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID
            signature: Razorpay signature
        
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            message = f"{order_id}|{payment_id}"
            expected_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            is_valid = expected_signature == signature
            
            if is_valid:
                logger.info(f"Payment signature verified: {payment_id}")
            else:
                logger.warning(f"Invalid payment signature: {payment_id}")
            
            return is_valid
        except Exception as e:
            logger.error(f"Error verifying signature: {str(e)}")
            return False

    def get_payment_details(self, payment_id: str) -> dict:
        """Fetch payment details from Razorpay"""
        try:
            payment = self.client.payment.fetch(payment_id)
            return payment
        except Exception as e:
            logger.error(f"Error fetching payment: {str(e)}")
            raise

    def process_payment_callback(self, order_id: str, payment_id: str, signature: str, donor_id: int) -> Payment:
        """
        Process successful payment callback from Razorpay
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID
            signature: Razorpay signature
            donor_id: ID of the user making payment
        
        Returns:
            Payment object
        """
        # Verify signature first
        if not self.verify_payment_signature(order_id, payment_id, signature):
            raise ValueError("Invalid payment signature")
        
        # Fetch payment details
        payment_details = self.get_payment_details(payment_id)
        
        # Get or create payment record
        try:
            payment = Payment.objects.get(order_id=order_id)
        except Payment.DoesNotExist:
            # Create new payment record if it doesn't exist
            user = User.objects.get(id=donor_id)
            payment = Payment.objects.create(
                donor=user,
                amount=payment_details['amount'] / 100,  # Convert from paise
                currency=payment_details['currency'],
                payment_method='razorpay',
                order_id=order_id,
                transaction_id=payment_id,
                signature=signature,
                raw_response=payment_details,
                status='completed',
                completed_at=timezone.now()
            )
        else:
            # Update existing record
            payment.transaction_id = payment_id
            payment.signature = signature
            payment.status = 'completed'
            payment.raw_response = payment_details
            payment.completed_at = timezone.now()
            payment.save()
        
        logger.info(f"Payment processed successfully: {payment.id}")
        return payment

    def create_refund(self, payment_id: str, amount: float = None, notes: str = '') -> dict:
        """
        Create a refund for a payment
        
        Args:
            payment_id: Razorpay payment ID to refund
            amount: Amount to refund (full if not specified)
            notes: Refund notes
        
        Returns:
            Refund details
        """
        try:
            refund_data = {'notes': notes} if notes else {}
            if amount:
                refund_data['amount'] = int(amount * 100)
            
            refund = self.client.payment.refund(payment_id, refund_data)
            
            # Update payment status
            try:
                payment = Payment.objects.get(transaction_id=payment_id)
                payment.status = 'refunded'
                payment.save()
                logger.info(f"Refund created: {refund['id']} for payment {payment_id}")
            except Payment.DoesNotExist:
                pass
            
            return refund
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            raise


class PaymentService:
    """High-level payment service"""

    def __init__(self):
        self.razorpay = RazorpayHandler()

    def initiate_payment(self, donor: User, amount: float, donation_type: str = 'food', 
                        notes: str = '') -> dict:
        """
        Initiate a payment for donation
        
        Returns:
            Order details for frontend
        """
        try:
            order = self.razorpay.create_order(
                amount=amount,
                currency='INR',
                notes={
                    'donor_id': donor.id,
                    'donor_name': donor.name,
                    'donation_type': donation_type,
                    'notes': notes[:200],
                }
            )
            
            # Create payment record
            payment = Payment.objects.create(
                donor=donor,
                amount=amount,
                currency='INR',
                payment_method='razorpay',
                order_id=order['id'],
                donation_type=donation_type,
                description=notes,
                status='pending'
            )
            
            return {
                'success': True,
                'payment_id': payment.id,
                'order_id': order['id'],
                'amount': int(amount * 100),  # in paise
                'currency': 'INR',
                'razorpay_key': settings.RAZORPAY_KEY_ID,
            }
        except Exception as e:
            logger.error(f"Error initiating payment: {str(e)}")
            return {'success': False, 'error': str(e)}

    def verify_payment(self, order_id: str, payment_id: str, signature: str, donor_id: int) -> dict:
        """Verify payment and update database"""
        try:
            payment = self.razorpay.process_payment_callback(order_id, payment_id, signature, donor_id)
            
            return {
                'success': True,
                'payment_id': payment.id,
                'transaction_id': payment.transaction_id,
                'amount': float(payment.amount),
                'status': payment.status,
            }
        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return {'success': False, 'error': str(e)}

    def process_webhook(self, event_data: dict) -> bool:
        """Process Razorpay webhook"""
        try:
            event_type = event_data.get('event')
            
            if event_type == 'payment.authorized':
                # Handle payment authorized
                payment_data = event_data.get('payload', {}).get('payment', {}).get('entity', {})
                # Update payment status if needed
                logger.info(f"Payment authorized: {payment_data.get('id')}")
            
            elif event_type == 'payment.failed':
                # Handle payment failure
                payment_data = event_data.get('payload', {}).get('payment', {}).get('entity', {})
                payment_id = payment_data.get('id')
                
                try:
                    payment = Payment.objects.get(transaction_id=payment_id)
                    payment.status = 'failed'
                    payment.save()
                except Payment.DoesNotExist:
                    pass
                
                logger.warning(f"Payment failed: {payment_id}")
            
            elif event_type == 'payment.captured':
                # Handle payment capture
                payment_data = event_data.get('payload', {}).get('payment', {}).get('entity', {})
                logger.info(f"Payment captured: {payment_data.get('id')}")
            
            return True
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return False
