from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum

from .models import Donation, FoodRequest, VolunteerLocation, DonationItem, DonationAssignment, Point, UserBadge, Badge, Leaderboard
from .serializers import (
    DonationSerializer, FoodRequestSerializer, VolunteerLocationSerializer,
    DonationItemSerializer
)
from .gamification_service import GamificationService
from .socketio_events import SocketEventHandler


# ─── Donation Views ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_donation(request):
    """Donors create a new food donation listing."""
    if request.user.role != 'donor':
        return Response({'error': 'Only donors can create donations.'}, status=403)

    serializer = DonationSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        donation = serializer.save()
        
        # Award points for creating a donation
        try:
            points_awarded = GamificationService.award_donation_points(donation)
            # Emit socket event for real-time notification
            event_data = {
                'user_id': request.user.id,
                'points_awarded': points_awarded,
                'reason': 'Donation created',
                'total_points': request.user.total_points
            }
            # You can emit to socket here if needed
        except Exception as e:
            # Log error but don't fail the donation creation
            print(f"Error awarding gamification points: {str(e)}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_donations(request):
    """
    All authenticated users can browse donations.
    Donors see their own; NGOs & volunteers see available ones.
    """
    role = request.user.role
    status_filter = request.query_params.get('status')

    if role == 'donor':
        qs = Donation.objects.filter(donor=request.user)
    else:
        qs = Donation.objects.all()

    qs = qs.order_by('-created_at')

    if status_filter:
        qs = qs.filter(status=status_filter)

    serializer = DonationSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def donation_detail(request, pk):
    try:
        donation = Donation.objects.get(pk=pk)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    if request.method == 'GET':
        return Response(DonationSerializer(donation).data)

    if request.method == 'PUT':
        if request.user != donation.donor:
            return Response({'error': 'Permission denied.'}, status=403)
        serializer = DonationSerializer(donation, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        if request.user != donation.donor:
            return Response({'error': 'Permission denied.'}, status=403)
        donation.delete()
        return Response({'message': 'Donation deleted.'}, status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_donation_status(request, pk):
    """Volunteers update delivery status; donors can cancel. FIXED: Now emits real-time socket events."""
    try:
        donation = Donation.objects.get(pk=pk)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    new_status = request.data.get('status')
    if not new_status:
        return Response({'error': 'Status is required.'}, status=400)

    valid_statuses = [s[0] for s in Donation.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)

    # Assign volunteer if accepting delivery
    if new_status in ['assigned', 'in_transit'] and request.user.role == 'volunteer':
        donation.volunteer = request.user

    old_status = donation.status
    donation.status = new_status
    donation.save()
    
    # Emit real-time socket event for status change
    try:
        from .socketio_events import DonationEventHandler
        event = DonationEventHandler.emit_donation_status_changed(donation)
        # Event will be emitted by your WebSocket server
    except Exception as e:
        print(f"Error emitting socket event: {str(e)}")
    
    # Create timeline entry for tracking (you may need to create a DonationTimeline model)
    try:
        from .models import DonationTimeline
        DonationTimeline.objects.create(
            donation=donation,
            status=new_status,
            changed_by=request.user,
            notes=request.data.get('notes', '')
        )
    except ImportError:
        pass  # Timeline model not yet created
    
    return Response(DonationSerializer(donation).data)


# ─── Food Request Views ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_request(request):
    """NGOs request a specific donation."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can make food requests.'}, status=403)

    serializer = FoodRequestSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        food_request = serializer.save()
        # Update donation status to requested
        donation = food_request.donation
        if donation.status == 'available':
            donation.status = 'requested'
            donation.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_requests(request):
    """
    NGOs see their own requests.
    Donors see requests on their donations.
    """
    role = request.user.role
    if role == 'ngo':
        qs = FoodRequest.objects.filter(ngo=request.user)
    elif role == 'donor':
        qs = FoodRequest.objects.filter(donation__donor=request.user)
    else:
        qs = FoodRequest.objects.all()

    serializer = FoodRequestSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_request_status(request, pk):
    """Donors approve or reject NGO requests."""
    try:
        food_request = FoodRequest.objects.get(pk=pk)
    except FoodRequest.DoesNotExist:
        return Response({'error': 'Request not found.'}, status=404)

    if request.user.role != 'donor' or food_request.donation.donor != request.user:
        return Response({'error': 'Permission denied.'}, status=403)

    new_status = request.data.get('status')
    if new_status not in ['approved', 'rejected']:
        return Response({'error': 'Status must be approved or rejected.'}, status=400)

    food_request.status = new_status
    food_request.save()

    if new_status == 'approved':
        food_request.donation.status = 'assigned'
        food_request.donation.save()

    return Response(FoodRequestSerializer(food_request).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Summary stats for dashboards."""
    user = request.user
    data = {}

    if user.role == 'donor':
        donations = Donation.objects.filter(donor=user)
        data = {
            'total_donations': donations.count(),
            'available': donations.filter(status='available').count(),
            'delivered': donations.filter(status='delivered').count(),
            'pending_requests': FoodRequest.objects.filter(
                donation__donor=user, status='pending'
            ).count(),
        }

    elif user.role == 'ngo':
        requests = FoodRequest.objects.filter(ngo=user)
        data = {
            'total_requests': requests.count(),
            'pending': requests.filter(status='pending').count(),
            'approved': requests.filter(status='approved').count(),
            'fulfilled': requests.filter(status='fulfilled').count(),
            'available_donations': Donation.objects.filter(status='available').count(),
        }

    elif user.role == 'volunteer':
        data = {
            'available_pickups': Donation.objects.filter(status='assigned').count(),
            'my_deliveries': Donation.objects.filter(volunteer=user).count(),
            'completed': Donation.objects.filter(volunteer=user, status='delivered').count(),
            'in_transit': Donation.objects.filter(volunteer=user, status='in_transit').count(),
        }

    return Response(data)


# ─── Location Views ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_location(request):
    """
    Volunteer POSTs their current GPS coords for REAL-TIME TRACKING.
    Body: { latitude, longitude, heading?, speed?, donation_id? }
    FIXED: Now emits real-time socket events for live map updates
    """
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can update location.'}, status=403)

    lat  = request.data.get('latitude')
    lng  = request.data.get('longitude')
    if lat is None or lng is None:
        return Response({'error': 'latitude and longitude are required.'}, status=400)

    donation_id = request.data.get('donation_id')
    donation    = None
    if donation_id:
        try:
            donation = Donation.objects.get(pk=donation_id, volunteer=request.user)
        except Donation.DoesNotExist:
            pass

    loc, _ = VolunteerLocation.objects.update_or_create(
        volunteer=request.user,
        defaults={
            'latitude':   float(lat),
            'longitude':  float(lng),
            'heading':    request.data.get('heading'),
            'speed':      request.data.get('speed'),
            'donation':   donation,
            'is_active':  True,
        }
    )
    
    # Emit real-time location update event via socket
    try:
        from .socketio_events import LocationEventHandler
        event = LocationEventHandler.emit_location_update(
            volunteer_id=request.user.id,
            latitude=float(lat),
            longitude=float(lng),
            donation_id=donation_id
        )
        # Event will be emitted by your WebSocket server
    except Exception as e:
        print(f"Error emitting location update event: {str(e)}")
    
    return Response(VolunteerLocationSerializer(loc).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stop_sharing_location(request):
    """Volunteer marks their location as inactive (went offline)."""
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can stop location sharing.'}, status=403)
    try:
        loc = VolunteerLocation.objects.get(volunteer=request.user)
        loc.is_active = False
        loc.save()
    except VolunteerLocation.DoesNotExist:
        pass
    return Response({'message': 'Location sharing stopped.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_donation_tracking(request, donation_id):
    """
    Returns full tracking info for a donation:
    - donation details (pickup coords, status)
    - volunteer's current location (if active)
    Accessible by donor, NGO, and the assigned volunteer.
    """
    try:
        donation = Donation.objects.get(pk=donation_id)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    user = request.user
    # Access control: only donor, the volunteer, or an NGO that requested it
    is_donor     = user == donation.donor
    is_volunteer = user == donation.volunteer
    is_ngo       = user.role == 'ngo' and donation.requests.filter(ngo=user, status='approved').exists()

    if not (is_donor or is_volunteer or is_ngo):
        return Response({'error': 'Permission denied.'}, status=403)

    data = DonationSerializer(donation).data

    volunteer_loc = None
    if donation.volunteer_id:
        try:
            loc = VolunteerLocation.objects.get(volunteer_id=donation.volunteer_id, is_active=True)
            volunteer_loc = VolunteerLocationSerializer(loc).data
        except VolunteerLocation.DoesNotExist:
            pass

    return Response({
        'donation':          data,
        'volunteer_location': volunteer_loc,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_active_volunteers(request):
    """
    Returns all currently active volunteer locations.
    Useful for donors/NGOs to see volunteer availability on a map.
    """
    locs = VolunteerLocation.objects.filter(is_active=True).select_related('volunteer')
    return Response(VolunteerLocationSerializer(locs, many=True).data)


# ─── FIXED: Volunteer Deliveries Endpoint ─────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def volunteer_my_deliveries(request):
    """
    Get all deliveries assigned to the current volunteer (FIXED endpoint).
    Shows all donations where volunteer is assigned, including 'assigned' and 'in_transit'.
    This solves the issue where deliveries disappear from volunteer's view.
    """
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can access this.'}, status=403)

    # Get ALL deliveries for this volunteer regardless of status
    deliveries = Donation.objects.filter(
        volunteer=request.user
    ).exclude(
        status__in=['available', 'requested', 'expired', 'cancelled']
    ).order_by('-created_at')

    serializer = DonationSerializer(deliveries, many=True)
    return Response(serializer.data)


# ─── REMOVED: Payment Views (Monetary donations no longer supported) ─────────────────────────────────────────────────────────────

# ─── Non-Food Donation Items Views ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_donation_item(request):
    """Donors donate non-food items (clothes, medicine, etc.)."""
    if request.user.role != 'donor':
        return Response({'error': 'Only donors can create donations.'}, status=403)

    serializer = DonationItemSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_donation_items(request):
    """
    Browse donation items.
    Donors see their own; volunteers/NGOs see available ones.
    """
    role = request.user.role
    item_type = request.query_params.get('item_type')
    category = request.query_params.get('category')

    if role == 'donor':
        qs = DonationItem.objects.filter(donor=request.user)
    else:
        qs = DonationItem.objects.filter(status='available')

    if item_type:
        qs = qs.filter(item_type=item_type)
    if category:
        qs = qs.filter(categories=category)

    qs = qs.order_by('-created_at')
    serializer = DonationItemSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def donation_item_detail(request, pk):
    """Get, update, or delete a donation item."""
    try:
        item = DonationItem.objects.get(pk=pk)
    except DonationItem.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=404)

    if request.method == 'GET':
        return Response(DonationItemSerializer(item).data)

    if request.method == 'PUT':
        if request.user != item.donor:
            return Response({'error': 'Permission denied.'}, status=403)
        serializer = DonationItemSerializer(
            item, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        if request.user != item.donor:
            return Response({'error': 'Permission denied.'}, status=403)
        item.delete()
        return Response({'message': 'Item deleted.'}, status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_item_status(request, pk):
    """Volunteers to update delivery status for items."""
    try:
        item = DonationItem.objects.get(pk=pk)
    except DonationItem.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=404)

    new_status = request.data.get('status')
    if not new_status:
        return Response({'error': 'Status is required.'}, status=400)

    valid_statuses = [s[0] for s in DonationItem.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)

    item.status = new_status
    item.save()
    return Response(DonationItemSerializer(item).data)


# ─── Gamification Views ────────────────────────────────────────────────────────

from django.db.models import Sum

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_points(request):
    """Fetch current user's total points."""
    user = request.user
    total_points = user.total_points if hasattr(user, 'total_points') else 0
    
    # Also get points breakdown by type
    points_breakdown = list(
        Point.objects.filter(user=user)
        .values('points_type')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )
    
    return Response({
        'total_points': total_points,
        'breakdown': points_breakdown
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_badges(request):
    """Fetch all badges earned by the current user."""
    user = request.user
    
    # Get all earned badges with their details
    earned_badges = UserBadge.objects.filter(user=user).select_related('badge')
    
    badges_data = [
        {
            'id': ub.badge.code,  # Use badge code as the identifier
            'code': ub.badge.code,
            'name': ub.badge.name,
            'description': ub.badge.description,
            'icon_url': ub.badge.icon_url,
            'icon_emoji': ub.badge.icon_emoji,
            'rarity': ub.badge.rarity,
            'earned_at': ub.earned_at,
        }
        for ub in earned_badges
    ]
    
    return Response({
        'badges': badges_data,
        'total_earned': len(badges_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_leaderboard(request):
    """Fetch leaderboard data filtered by role and period."""
    user = request.user
    role = request.query_params.get('role', user.role)
    period = request.query_params.get('period', 'weekly')
    
    # Validate period
    valid_periods = ['weekly', 'monthly', 'all_time']
    if period not in valid_periods:
        return Response({'error': f'Invalid period. Choose from: {valid_periods}'}, status=400)
    
    # Map role parameter to database role
    role_map = {'donor': 'donor', 'volunteer': 'volunteer', 'ngo': 'ngo'}
    db_role = role_map.get(role)
    if not db_role:
        return Response({'error': 'Invalid role.'}, status=400)
    
    # Fetch leaderboard entries from cache
    leaderboard = Leaderboard.objects.filter(
        role=db_role,
        period=period
    ).order_by('rank')[:100]
    
    # If leaderboard is empty, try to recalculate it dynamically
    if not leaderboard.exists():
        try:
            GamificationService.recalculate_leaderboard(period)
            leaderboard = Leaderboard.objects.filter(
                role=db_role,
                period=period
            ).order_by('rank')[:100]
        except Exception as e:
            print(f"Error recalculating leaderboard: {str(e)}")
    
    # If still empty after recalculation, compute dynamically from Points
    if not leaderboard.exists():
        from django.db.models import Sum as DSum
        from accounts.models import User as AccountUser
        users_with_points = (
            AccountUser.objects.filter(role=db_role, is_active=True)
            .annotate(pts=DSum('points__amount'))
            .filter(pts__gt=0)
            .order_by('-pts')[:100]
        )
        leaderboard_data = []
        for idx, u in enumerate(users_with_points, 1):
            leaderboard_data.append({
                'rank': idx,
                'user_name': u.name or u.email,
                'total_points': u.pts or 0,
                'donations_count': Donation.objects.filter(donor=u).count() if db_role == 'donor' else 0,
                'deliveries_count': Donation.objects.filter(volunteer=u, status='delivered').count() if db_role == 'volunteer' else 0,
            })
    else:
        leaderboard_data = [
            {
                'rank': entry.rank,
                'user_name': entry.user.name if hasattr(entry.user, 'name') else entry.user.email,
                'total_points': entry.total_points,
                'donations_count': entry.donations_count,
                'deliveries_count': getattr(entry, 'deliveries_count', 0),
            }
            for entry in leaderboard
        ]
    
    # Find current user's rank
    user_rank_data = None
    if db_role == user.role:
        # Try from cached leaderboard
        try:
            user_entry = Leaderboard.objects.get(
                user=user,
                role=db_role,
                period=period
            )
            user_rank_data = {
                'rank': user_entry.rank,
                'total_points': user_entry.total_points,
                'donations_count': user_entry.donations_count,
            }
        except Leaderboard.DoesNotExist:
            # Compute dynamically
            user_total = Point.objects.filter(user=user).aggregate(total=Sum('amount'))['total'] or 0
            if user_total > 0:
                user_rank_data = {
                    'rank': '—',
                    'total_points': user_total,
                    'donations_count': Donation.objects.filter(donor=user).count() if db_role == 'donor' else 0,
                }
    
    return Response({
        'leaderboard': leaderboard_data,
        'user_rank': user_rank_data,
        'period': period,
        'role': db_role
    })


# ─── Additional Endpoints for Frontend ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_donations(request):
    """List all available donations for volunteers and NGOs."""
    qs = Donation.objects.filter(status='available').order_by('-created_at')
    serializer = DonationSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_donation(request, pk):
    """Volunteer accepts a donation to deliver."""
    if request.user.role != 'volunteer':
        return Response({'error': 'Only volunteers can accept donations.'}, status=403)

    try:
        donation = Donation.objects.get(pk=pk)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    donation.volunteer = request.user
    donation.status = 'assigned'
    donation.save()

    return Response(DonationSerializer(donation).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_donation(request, pk):
    """NGO assigns donation to a volunteer."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can assign donations.'}, status=403)

    try:
        donation = Donation.objects.get(pk=pk)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    volunteer_id = request.data.get('volunteer_id')
    if not volunteer_id:
        return Response({'error': 'volunteer_id is required.'}, status=400)

    from accounts.models import User
    try:
        volunteer = User.objects.get(pk=volunteer_id, role='volunteer')
    except User.DoesNotExist:
        return Response({'error': 'Volunteer not found.'}, status=404)

    from .models import DonationAssignment
    assignment, _ = DonationAssignment.objects.get_or_create(
        donation=donation,
        defaults={'ngo': request.user, 'volunteer': volunteer, 'status': 'assigned'}
    )
    assignment.ngo = request.user
    assignment.volunteer = volunteer
    assignment.status = 'assigned'
    assignment.save()

    donation.status = 'assigned'
    donation.volunteer = volunteer
    donation.save()

    return Response({'message': 'Donation assigned to volunteer', 'assignment_id': assignment.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_delivered(request, pk):
    """Mark a donation as delivered and award volunteer points."""
    try:
        donation = Donation.objects.get(pk=pk)
    except Donation.DoesNotExist:
        return Response({'error': 'Donation not found.'}, status=404)

    if donation.volunteer and request.user != donation.volunteer:
        return Response({'error': 'Only assigned volunteer can mark as delivered.'}, status=403)

    donation.status = 'delivered'
    donation.save()
    
    # Award points to volunteer for completing delivery
    if donation.volunteer:
        try:
            from .models import DonationAssignment
            # Try to get assignment record, create one if not exists
            assignment = DonationAssignment.objects.filter(donation=donation).first()
            if not assignment:
                # Create assignment record for direct volunteer accepts
                assignment = DonationAssignment.objects.create(
                    donation=donation,
                    volunteer=donation.volunteer,
                    delivery_type='volunteer',
                    status='delivered',
                    delivered_at=timezone.now(),
                )
            else:
                assignment.status = 'delivered'
                assignment.delivered_at = timezone.now()
                assignment.save()
            
            points_awarded = GamificationService.award_delivery_points(assignment, donation.volunteer)
            
            # Also update leaderboard cache
            try:
                GamificationService.recalculate_leaderboard('weekly')
                GamificationService.recalculate_leaderboard('all_time')
            except Exception:
                pass
        except Exception as e:
            print(f"Error awarding delivery points: {str(e)}")

    return Response(DonationSerializer(donation).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ngo_my_assignments(request):
    """Get NGO's donation assignments."""
    if request.user.role != 'ngo':
        return Response({'error': 'Only NGOs can view assignments.'}, status=403)

    from .models import DonationAssignment
    assignments = DonationAssignment.objects.filter(ngo=request.user).select_related(
        'donation', 'volunteer'
    ).order_by('-assigned_at')
    data = [
        {
            'id': a.id,
            'donation_id': a.donation.id,
            'food_details': a.donation.food_details,
            'volunteer_id': a.volunteer.id if a.volunteer else None,
            'volunteer_name': a.volunteer.name if a.volunteer else None,
            'status': a.status,
            'created_at': a.assigned_at,
        }
        for a in assignments
    ]
    return Response(data)
