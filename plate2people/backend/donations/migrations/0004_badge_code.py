# Generated migration to add badge code field

from django.db import migrations, models


def populate_badge_codes(apps, schema_editor):
    """Populate badge codes based on existing badge names"""
    Badge = apps.get_model('donations', 'Badge')
    
    # Map of badge names to codes
    name_to_code = {
        'First Donation': 'first_donation',
        'Food Hero': 'food_hero',
        'Golden Donor': 'golden_donor',
        'Delivery Starter': 'delivery_starter',
        'Delivery Master': 'delivery_master',
        'Delivery Legend': 'delivery_legend',
        'NGO Partner': 'ngo_partner',
        'NGO Champion': 'ngo_champion',
    }
    
    for badge in Badge.objects.all():
        if badge.name in name_to_code:
            badge.code = name_to_code[badge.name]
            badge.save()


class Migration(migrations.Migration):

    dependencies = [
        ('donations', '0003_badge_donationassignment_foodimage_userbadge_point_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='badge',
            name='code',
            field=models.CharField(default='', max_length=100),
        ),
        migrations.RunPython(populate_badge_codes),
        migrations.AlterField(
            model_name='badge',
            name='code',
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
