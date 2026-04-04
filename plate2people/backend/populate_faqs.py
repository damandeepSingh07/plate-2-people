"""
Management command to populate chatbot FAQs.
Run: python manage.py shell < populate_faqs.py
Or: python manage.py < populate_faqs.py
"""

from chat.models import ChatbotFAQ

# Clear existing FAQs
ChatbotFAQ.objects.all().delete()

faqs_data = [
    # ─── FOOD DONATION ─────────────────────────────────────────────────
    {
        'question': 'How do I donate food?',
        'answer': 'Visit your Donor Dashboard and click "Post a Donation". Fill in details about the food (type, quantity, pickup time). Make sure food is fresh and stored properly. You can donate cooked food, raw ingredients, packaged food, beverages, or bakery items.',
        'category': 'donation',
        'keywords': 'donate, food, post, listing, how',
    },
    {
        'question': 'What types of food can I donate?',
        'answer': 'You can donate: Cooked Food (meals, prepared dishes), Raw Ingredients (rice, vegetables, flour), Packaged Food (dry goods, snacks), Beverages (water, juice, milk), Bakery Items (bread, pastries), or Other items. All food must be fresh and safe to eat.',
        'category': 'donation',
        'keywords': 'food type, cooked, raw, packaged, beverages, bakery',
    },
    {
        'question': 'How long does food stay available?',
        'answer': 'Food donations stay available until a volunteer accepts it or the expiry time passes, whichever comes first. Set realistic expiry times based on food type. Fresh food: 2-4 hours. Packaged food: 24+ hours. Cooked food from restaurants: 1-3 hours.',
        'category': 'process',
        'keywords': 'available, duration, time, expiry, deadline, how long',
    },
    {
        'question': 'Can I set a pickup time for my donation?',
        'answer': 'Yes! When posting a donation, you can specify a preferred pickup time. Volunteers will see this time and try to pick up accordingly. Setting a specific time helps ensure food freshness and reliability.',
        'category': 'process',
        'keywords': 'pickup, time, schedule, schedule delivery',
    },
    {
        'question': 'What happens after I post a donation?',
        'answer': 'After posting: 1) Your donation appears in the app, 2) Volunteers can accept it, 3) You receive notification when a volunteer is coming, 4) Volunteer picks up the food, 5) You are notified about delivery to the NGO.',
        'category': 'process',
        'keywords': 'after, post, donation, workflow, process, steps',
    },
    {
        'question': 'Can I track where my food donation goes?',
        'answer': 'Yes! Click "Track on Map" on your donation to see the volunteer\'s live location and delivery status. You can see when they pick up and when they deliver to the NGO.',
        'category': 'tracking',
        'keywords': 'track, location, monitor, map, delivery status',
    },
    {
        'question': 'What if my food donation expires without being picked up?',
        'answer': 'If a donation reaches its expiry time without pickup, the status automatically changes to "expired". Update the status to "cancelled" if you\'ve given it away or used it yourself. Volunteers will no longer see expired donations.',
        'category': 'donation',
        'keywords': 'expire, expiry, waste, cancel, what happens',
    },

    # ─── VOLUNTEER - DELIVERY ─────────────────────────────────────────
    {
        'question': 'How do I start volunteering?',
        'answer': 'Sign up as a Volunteer with your details (vehicle type, availability). Once registered, go to your Volunteer Dashboard and browse "Available Pickups". Accept any pickup you can deliver, then start the delivery process.',
        'category': 'volunteer',
        'keywords': 'volunteer, signup, register, how to start, begin',
    },
    {
        'question': 'How do I accept a food donation to deliver?',
        'answer': 'In your Volunteer Dashboard, go to "Available Pickups" tab. Find a donation you can deliver. Click the "Accept Pickup" button. The donation status changes to "Assigned". You can then start the actual pickup.',
        'category': 'volunteer',
        'keywords': 'accept, pickup, volunteer, agree, delivery',
    },
    {
        'question': 'How do I share my location during delivery?',
        'answer': 'Once you accept a pickup, click "Share Live Location" button. This broadcasts your GPS coordinates every few seconds. The donor can track you on the map. Stop sharing after delivery completes.',
        'category': 'volunteer',
        'keywords': 'location, share, gps, tracking, live, broadcast',
    },
    {
        'question': 'Can I get turn-by-turn directions to the delivery location?',
        'answer': 'Yes! After accepting a pickup, click "Get Directions" button to see turn-by-turn navigation using Google Maps. You\'ll see the pickup location, delivery location, estimated time, and distance.',
        'category': 'volunteer',
        'keywords': 'directions, navigation, map, route, google maps, turn by turn',
    },
    {
        'question': 'What should I do when I pick up the food?',
        'answer': 'When at the pickup location: 1) Confirm details with donor, 2) Check food quality and freshness, 3) Handle carefully to prevent spoilage, 4) Use gloves if available, 5) Click "Start Pickup" in the app.',
        'category': 'volunteer',
        'keywords': 'pickup, collect, get, receive, food',
    },
    {
        'question': 'How do I mark a delivery as complete?',
        'answer': 'After delivering food to the NGO: 1) Confirm receipt with NGO, 2) Get signature/photo if needed, 3) Click "Mark Delivered" button in the app. The donation status changes to "Delivered".',
        'category': 'volunteer',
        'keywords': 'deliver, complete, finish, mark done, delivered',
    },
    {
        'question': 'What vehicle types are supported?',
        'answer': 'The app supports all vehicle types: Bicycle, Motorcycle, Scooter, Auto-rickshaw, Car, Van, Truck. Select your vehicle when registering. This helps donors understand delivery capacity.',
        'category': 'volunteer',
        'keywords': 'vehicle, car, bike, motorcycle, transport, type',
    },

    # ─── PAYMENT / ONLINE DONATION ──────────────────────────────────
    {
        'question': 'Can I donate money online instead of food?',
        'answer': 'Yes! You can make online monetary donations through our secure payment system. Go to Donor Dashboard and click "Make Donation". Choose your amount, payment method (Razorpay, card, or bank transfer), and complete the payment.',
        'category': 'donation',
        'keywords': 'payment, money, donate, online, fund, rupees',
    },
    {
        'question': 'What payment methods are supported?',
        'answer': 'We support multiple payment methods: Razorpay (fastest), Credit/Debit Cards (VISA, Mastercard), UPI, Netbanking, Bank Transfer, and PayPal. Choose the method most convenient for you.',
        'category': 'donation',
        'keywords': 'payment method, card, upi, bank, razorpay, paypal',
    },
    {
        'question': 'Is my payment information secure?',
        'answer': 'Yes! All payments are processed through secure, PCI-DSS compliant payment gateways (Razorpay, Stripe, PayPal). Your payment data is encrypted and never stored on our servers. Bank-level security is used.',
        'category': 'donation',
        'keywords': 'secure, safety, encryption, privacy, payment',
    },
    {
        'question': 'Can I get a receipt for my donation?',
        'answer': 'Yes! After successful payment, you\'ll receive an instant email receipt with transaction details, amount, date, and payment method. You can also view all your donations in "My Donations" section.',
        'category': 'donation',
        'keywords': 'receipt, invoice, proof, transaction, email',
    },
    {
        'question': 'What happens to my monetary donation?',
        'answer': 'Your monetary donation goes into our general fund to support operations. Donations are used to: buy food in bulk for NGOs, transport costs, platform maintenance, and community programs. 100% of donations support the cause.',
        'category': 'general',
        'keywords': 'where, money, fund, use, purpose, support',
    },
    {
        'question': 'Can I track where my money donation goes?',
        'answer': 'You can see your donation history and status. We publish monthly reports on how donations are used. NGOs we partner with also send impact reports showing how donations helped beneficiaries.',
        'category': 'tracking',
        'keywords': 'track, report, impact,  where money, utilize',
    },

    # ─── NON-FOOD DONATIONS ────────────────────────────────────────
    {
        'question': 'Can I donate non-food items like clothes?',
        'answer': 'Yes! Besides food (our primary focus), you can donate: Clothes, Medicine, Books, Toys, Utensils, Blankets, Shoes, Hygiene Products, School Supplies. These are secondary donations to help communities.',
        'category': 'donation',
        'keywords': 'clothes, medicine, books, items, non-food, secondary',
    },
    {
        'question': 'How do I donate clothes and other essentials?',
        'answer': 'In Donor Dashboard, click "Donate Items". Select item type (clothes, medicine, etc.), add details (condition, quantity, description), set location and pickup time. Volunteers will accept and deliver just like food donations.',
        'category': 'donation',
        'keywords': 'donate items, clothes, essentials, non-food, secondary',
    },
    {
        'question': 'What condition should donations be in?',
        'answer': 'Good condition is best. You can donate items in: New (unused), Excellent (minimal wear), Good (normal wear), or Fair (usable but visible wear). Be honest about condition. NGOs can decide what they need.',
        'category': 'donation',
        'keywords': 'condition, quality, new, good, wear, usable',
    },
    {
        'question': 'Can I donate medicine?',
        'answer': 'Yes! Medicine donations are very helpful. Donate: Unopened, in-date medicines, Supplements, First-aid items, Medical supplies. Always check expiry dates. Medicine should be in original packaging.',
        'category': 'donation',
        'keywords': 'medicine, medical, pharmaceutical, health, pills',
    },
    {
        'question': 'What items should I NOT donate?',
        'answer': 'Please do NOT donate: Expired items, Damaged/broken goods, Hazardous materials, Recalled products, Adult content, Weapons, Stolen items. Only donate items you would use yourself.',
        'category': 'donation',
        'keywords': 'not donate, avoid, dont, banned, prohibited',
    },

    # ─── NGO / RECEIVING DONATIONS ─────────────────────────────────
    {
        'question': 'Are you an NGO looking to receive donations?',
        'answer': 'Yes, we partner with NGOs! Sign up as an NGO in the app. You can browse available donations, request food or items, and receive deliveries from volunteers. Beneficiaries will be fed and supported.',
        'category': 'ngo',
        'keywords': 'ngo, organization, charity, receive, request',
    },
    {
        'question': 'How do NGOs request food donations?',
        'answer': 'Login as NGO. Browse "Available Donations". Click on a donation and request it by providing your delivery address and required date. The donor can then approve or reject your request.',
        'category': 'ngo',
        'keywords': 'ngo, request, ask, apply, food, help',
    },

    # ─── GENERAL QUESTIONS ──────────────────────────────────────────
    {
        'question': 'What is Plate2People?',
        'answer': 'Plate2People is a platform connecting food donors with NGOs and volunteers to eliminate food waste and feed communities. Our mission: Share surplus food, reduce waste, feed the hungry. Food is our primary focus, with secondary support for other essentials.',
        'category': 'general',
        'keywords': 'about, mission, purpose, what is, plate2people',
    },
    {
        'question': 'Who can use Plate2People?',
        'answer': 'Anyone can use the platform: Donors (restaurants, homes, events), Volunteers (people with vehicles), NGOs (organizations helping communities). Sign up with your role and start helping!',
        'category': 'general',
        'keywords': 'user, who, can use, participate, roles',
    },
    {
        'question': 'Is this service free?',
        'answer': 'Yes! The app is completely free for donors, volunteers, and NGOs. Monetary donations are optional. Posting food and item donations, volunteering, and receiving help are all free. We\'re supported by donations.',
        'category': 'general',
        'keywords': 'free, cost, price, charge, donation',
    },
    {
        'question': 'How do I contact support?',
        'answer': 'You can reach us through: In-app chat with our AI assistant (24/7), Email support at support@plate2people.org, or call our helpline. We respond within 24 hours.',
        'category': 'technical',
        'keywords': 'support, help, contact, reach, communication',
    },
    {
        'question': 'Is my food donation safe?',
        'answer': 'Food safety is our priority! We encourage donors to: Check food freshness before posting, Set realistic expiry times, Store food properly, Handle with clean containers. Volunteers are trained to handle food hygienically.',
        'category': 'general',
        'keywords': 'safe, safety, health, hygiene, fresh, quality',
    },
    {
        'question': 'What happens if I have a problem with a delivery?',
        'answer': 'Report issues immediately through the app or contact support. Be specific: What happened, when, who was involved. We investigate and ensure fair resolution. Your feedback helps us improve.',
        'category': 'technical',
        'keywords': 'problem, issue, complaint, report, dispute, help',
    },
]

for faq_data in faqs_data:
    faq, created = ChatbotFAQ.objects.get_or_create(
        question=faq_data['question'],
        defaults={
            'answer': faq_data['answer'],
            'category': faq_data['category'],
            'keywords': faq_data['keywords'],
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Created: {faq_data['question'][:50]}...")
    else:
        print(f"✗ Already exists: {faq_data['question'][:50]}...")

print(f"\n✅ Total FAQs: {ChatbotFAQ.objects.count()}")
