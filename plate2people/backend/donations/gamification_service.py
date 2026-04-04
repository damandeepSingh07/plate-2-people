"""
Gamification Service
Handles points allocation, badge awarding, and leaderboard logic
"""
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from .models import Point, Badge, UserBadge, Donation, DonationAssignment, Leaderboard
from accounts.models import User


class GamificationService:
    """Service to manage gamification features"""

    # Points configuration
    POINTS_CONFIG = {
        'donation': 5,  # Donor posts food
        'donation_with_image': 3,  # Bonus for photo
        'delivery': 10,  # Volunteer completes delivery
        'assignment_completion': 15,  # NGO completes assignment
        'chat_engagement': 2,  # Per message in chat (max 10/day)
    }

    # Badge criteria
    BADGE_CRITERIA = {
        'first_donation': {'type': 'donation_count', 'value': 1, 'role': 'donor'},
        'food_hero': {'type': 'donation_count', 'value': 10, 'role': 'donor'},
        'golden_donor': {'type': 'donation_count', 'value': 50, 'role': 'donor'},
        'delivery_starter': {'type': 'delivery_count', 'value': 1, 'role': 'volunteer'},
        'delivery_master': {'type': 'delivery_count', 'value': 25, 'role': 'volunteer'},
        'delivery_legend': {'type': 'delivery_count', 'value': 100, 'role': 'volunteer'},
        'ngo_partner': {'type': 'assignment_count', 'value': 1, 'role': 'ngo'},
        'ngo_champion': {'type': 'assignment_count', 'value': 50, 'role': 'ngo'},
    }

    @staticmethod
    def award_donation_points(donation: Donation) -> float:
        """Award points when donor creates a donation"""
        points = GamificationService.POINTS_CONFIG['donation']
        
        # Bonus points for image upload
        if hasattr(donation, 'food_image') and donation.food_image:
            points += GamificationService.POINTS_CONFIG['donation_with_image']
        
        # Create point record
        Point.objects.create(
            user=donation.donor,
            points_type='donation' if not hasattr(donation, 'food_image') else 'donation_with_image',
            amount=points,
            reason=f"Posted donation: {donation.food_details[:50]}",
            donation=donation
        )
        
        # Update user total points
        donation.donor.total_points += points
        donation.donor.save()
        
        # Check for badges
        GamificationService.check_donor_badges(donation.donor)
        
        return points

    @staticmethod
    def award_delivery_points(assignment: DonationAssignment, volunteer: User) -> float:
        """Award points when volunteer completes a delivery"""
        points = GamificationService.POINTS_CONFIG['delivery']
        
        Point.objects.create(
            user=volunteer,
            points_type='delivery',
            amount=points,
            reason=f"Completed delivery for {assignment.donation.food_details[:50]}",
            assignment=assignment
        )
        
        volunteer.total_points += points
        volunteer.save()
        
        # Check for badges
        GamificationService.check_volunteer_badges(volunteer)
        
        return points

    @staticmethod
    def award_ngo_assignment_points(assignment: DonationAssignment, ngo: User) -> float:
        """Award points when NGO completes an assignment"""
        points = GamificationService.POINTS_CONFIG['assignment_completion']
        
        Point.objects.create(
            user=ngo,
            points_type='assignment',
            amount=points,
            reason=f"Completed assignment for {assignment.donation.food_details[:50]}",
            assignment=assignment
        )
        
        ngo.total_points += points
        ngo.save()
        
        # Check for badges
        GamificationService.check_ngo_badges(ngo)
        
        return points

    @staticmethod
    def award_chat_points(user: User) -> float:
        """Award points for chat engagement (rate-limited)"""
        points = GamificationService.POINTS_CONFIG['chat_engagement']
        
        # Check daily limit (max 10 points/day from chat)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_chat_points = Point.objects.filter(
            user=user,
            points_type='chat_engagement',
            created_at__gte=today_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if today_chat_points < 10:
            remaining = 10 - today_chat_points
            award = min(points, remaining)
            
            Point.objects.create(
                user=user,
                points_type='chat_engagement',
                amount=award,
                reason="Active chat engagement"
            )
            
            user.total_points += award
            user.save()
            
            return award
        
        return 0

    @staticmethod
    def check_donor_badges(user: User) -> list:
        """Check and award donor badges"""
        earned_badges = []
        
        if user.role != 'donor':
            return earned_badges
        
        donation_count = Donation.objects.filter(donor=user).count()
        
        badge_mappings = {
            'first_donation': (1, '🎉'),
            'food_hero': (10, '🦸'),
            'golden_donor': (50, '👑'),
        }
        
        for badge_key, (count_threshold, emoji) in badge_mappings.items():
            if donation_count >= count_threshold:
                badge, created = Badge.objects.get_or_create(
                    name=badge_key.replace('_', ' ').title(),
                    defaults={
                        'description': f'Earned after {count_threshold} donations',
                        'icon_url': '',
                        'icon_emoji': emoji,
                        'criteria': {'type': 'donation_count', 'value': count_threshold},
                    }
                )
                
                user_badge, is_new = UserBadge.objects.get_or_create(user=user, badge=badge)
                if is_new:
                    earned_badges.append(badge)
        
        return earned_badges

    @staticmethod
    def check_volunteer_badges(user: User) -> list:
        """Check and award volunteer badges"""
        earned_badges = []
        
        if user.role != 'volunteer':
            return earned_badges
        
        delivery_count = DonationAssignment.objects.filter(
            volunteer=user,
            status='delivered'
        ).count()
        
        # Also count direct deliveries (volunteer accepted without NGO assignment)
        direct_delivery_count = Donation.objects.filter(
            volunteer=user,
            status='delivered'
        ).count()
        
        # Use the higher count to ensure badges are awarded for all delivery types
        delivery_count = max(delivery_count, direct_delivery_count)
        
        badge_mappings = {
            'delivery_starter': (1, '🚀'),
            'delivery_master': (25, '⚡'),
            'delivery_legend': (100, '🌟'),
        }
        
        for badge_key, (count_threshold, emoji) in badge_mappings.items():
            if delivery_count >= count_threshold:
                badge, created = Badge.objects.get_or_create(
                    name=badge_key.replace('_', ' ').title(),
                    defaults={
                        'description': f'Earned after {count_threshold} deliveries',
                        'icon_url': '',
                        'icon_emoji': emoji,
                        'criteria': {'type': 'delivery_count', 'value': count_threshold},
                    }
                )
                
                user_badge, is_new = UserBadge.objects.get_or_create(user=user, badge=badge)
                if is_new:
                    earned_badges.append(badge)
        
        return earned_badges

    @staticmethod
    def check_ngo_badges(user: User) -> list:
        """Check and award NGO badges"""
        earned_badges = []
        
        if user.role != 'ngo':
            return earned_badges
        
        assignment_count = DonationAssignment.objects.filter(
            ngo=user,
            status='delivered'
        ).count()
        
        badge_mappings = {
            'ngo_partner': (1, '🤝'),
            'ngo_champion': (50, '🏆'),
        }
        
        for badge_key, (count_threshold, emoji) in badge_mappings.items():
            if assignment_count >= count_threshold:
                badge, created = Badge.objects.get_or_create(
                    name=badge_key.replace('_', ' ').title(),
                    defaults={
                        'description': f'Earned after {count_threshold} assignments',
                        'icon_url': '',
                        'icon_emoji': emoji,
                        'criteria': {'type': 'assignment_count', 'value': count_threshold},
                    }
                )
                
                user_badge, is_new = UserBadge.objects.get_or_create(user=user, badge=badge)
                if is_new:
                    earned_badges.append(badge)
        
        return earned_badges

    @staticmethod
    def recalculate_leaderboard(period: str = 'weekly') -> list:
        """Recalculate leaderboard for given period"""
        now = timezone.now()
        
        # Determine period boundaries
        if period == 'weekly':
            period_start = now - timedelta(days=now.weekday())
            period_end = period_start + timedelta(days=7)
        elif period == 'monthly':
            period_start = now.replace(day=1, hour=0, minute=0, second=0)
            # Calculate last day of month
            if period_start.month == 12:
                period_end = period_start.replace(year=period_start.year + 1, month=1)
            else:
                period_end = period_start.replace(month=period_start.month + 1)
        else:  # all_time
            period_start = timezone.now().replace(year=2000)
            period_end = now
        
        leaderboard_entries = []
        
        # Update for each role
        for role in ['donor', 'volunteer', 'ngo']:
            users = User.objects.filter(role=role, is_active=True)
            
            entries_with_points = []
            for user in users:
                total_points = Point.objects.filter(
                    user=user,
                    created_at__gte=period_start,
                    created_at__lte=period_end
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                if total_points > 0:
                    entries_with_points.append((user, total_points))
            
            # Sort by points descending
            entries_with_points.sort(key=lambda x: x[1], reverse=True)
            
            # Create leaderboard entries
            for rank, (user, points) in enumerate(entries_with_points, 1):
                if role == 'donor':
                    donations_count = Donation.objects.filter(donor=user).count()
                    deliveries_count = 0
                elif role == 'volunteer':
                    donations_count = 0
                    deliveries_count = DonationAssignment.objects.filter(
                        volunteer=user,
                        status='delivered'
                    ).count()
                else:  # ngo
                    donations_count = 0
                    deliveries_count = DonationAssignment.objects.filter(
                        ngo=user,
                        status='delivered'
                    ).count()
                
                lb_entry, _ = Leaderboard.objects.update_or_create(
                    user=user,
                    period=period,
                    role=role,
                    defaults={
                        'total_points': points,
                        'rank': rank,
                        'donations_count': donations_count,
                        'deliveries_count': deliveries_count,
                        'period_start': period_start,
                        'period_end': period_end,
                    }
                )
                leaderboard_entries.append(lb_entry)
        
        return leaderboard_entries

    @staticmethod
    def get_user_leaderboard_rank(user: User, period: str = 'weekly') -> dict:
        """Get user's current leaderboard rank"""
        entry = Leaderboard.objects.filter(
            user=user,
            period=period,
            role=user.role
        ).first()
        
        if entry:
            return {
                'rank': entry.rank,
                'points': entry.total_points,
                'period': period,
            }
        
        return {'rank': None, 'points': 0, 'period': period}

    @staticmethod
    def get_leaderboard(role: str, period: str = 'weekly', limit: int = 10) -> list:
        """Get top users for leaderboard"""
        entries = Leaderboard.objects.filter(
            role=role,
            period=period
        ).order_by('rank')[:limit]
        
        return [
            {
                'rank': entry.rank,
                'user_id': entry.user.id,
                'user_name': entry.user.name,
                'user_avatar': entry.user.avatar_url,
                'total_points': entry.total_points,
                'donations_count': entry.donations_count,
                'deliveries_count': entry.deliveries_count,
            }
            for entry in entries
        ]
