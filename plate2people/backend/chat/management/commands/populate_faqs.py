from django.core.management.base import BaseCommand
from chat.models import ChatbotFAQ


class Command(BaseCommand):
    help = 'Populate chatbot with all FAQs (system, casual, funny)'

    def handle(self, *args, **options):
        # Delete existing FAQs
        ChatbotFAQ.objects.all().delete()
        self.stdout.write(self.style.WARNING('Cleared existing FAQs'))

        faqs_data = [
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # CATEGORY 1: SYSTEM-RELATED (Donation, NGO, Volunteer, Tracking)
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {
                'question': 'How do I donate food?',
                'answer': 'Go to Donor Dashboard → Click "New Donation" → Select Food → Enter details (quantity, expiry, pickup location) → Submit. We\'ll assign a volunteer!',
                'category': 'donation',
                'keywords': 'donate, food, how, post, new donation, submit',
            },
            {
                'question': 'Who can pick up my donation?',
                'answer': 'Our verified volunteers from nearby NGOs. You\'ll get a notification once someone accepts.',
                'category': 'volunteer',
                'keywords': 'pick up, who, volunteer, collect, accept, notification',
            },
            {
                'question': 'Can I track my donation?',
                'answer': 'Yes! After pickup, check "My Donations" – live map + status updates (Picked → In Transit → Delivered).',
                'category': 'tracking',
                'keywords': 'track, donation, map, status, live, location, monitor',
            },
            {
                'question': 'What items can I donate besides food?',
                'answer': 'Clothes, books, toys, stationery – anything non-perishable. Select "Others" in donation form.',
                'category': 'donation',
                'keywords': 'items, donate, clothes, books, toys, non-food, others, besides',
            },
            {
                'question': 'How do NGOs get my donation?',
                'answer': 'We match based on location & need. You can choose specific NGO too.',
                'category': 'ngo',
                'keywords': 'ngo, get, how, match, location, organization, receive',
            },
            {
                'question': 'Is there a deadline for food pickup?',
                'answer': 'Yes – before expiry date. Volunteers try to collect within 24 hours.',
                'category': 'process',
                'keywords': 'deadline, pickup, time, expiry, hours, when, limit',
            },
            {
                'question': 'What if volunteer doesn\'t show up?',
                'answer': 'Report in-app → We\'ll re-assign or cancel. You get points for reporting!',
                'category': 'volunteer',
                'keywords': 'volunteer, no show, missing, report, reassign, cancel, problem',
            },
            {
                'question': 'Can I chat with the volunteer?',
                'answer': 'Yes, once assigned – open "Chat" from donation details.',
                'category': 'process',
                'keywords': 'chat, volunteer, message, talk, communicate, assigned',
            },
            {
                'question': 'How many points do I get for donating?',
                'answer': '50 points per donation + bonus if it\'s urgent (expiry < 12 hrs).',
                'category': 'donation',
                'keywords': 'points, earn, reward, how many, bonus, gamification',
            },
            {
                'question': 'Do you accept cooked food?',
                'answer': 'Yes, if fresh & sealed. Mention cooking time in description.',
                'category': 'donation',
                'keywords': 'cooked, food, accept, fresh, sealed, meal, prepared',
            },

            # Additional system FAQs from original seeder
            {
                'question': 'What types of food can I donate?',
                'answer': 'You can donate: Cooked Food (meals, prepared dishes), Raw Ingredients (rice, vegetables, flour), Packaged Food (dry goods, snacks), Beverages (water, juice, milk), Bakery Items (bread, pastries), or Other items. All food must be fresh and safe to eat.',
                'category': 'donation',
                'keywords': 'food type, cooked, raw, packaged, beverages, bakery, what',
            },
            {
                'question': 'How long does food stay available?',
                'answer': 'Food donations stay available until a volunteer accepts it or the expiry time passes, whichever comes first. Set realistic expiry times based on food type.',
                'category': 'process',
                'keywords': 'available, duration, time, expiry, how long, stay',
            },
            {
                'question': 'Can I set a pickup time for my donation?',
                'answer': 'Yes! When posting a donation, you can specify a preferred pickup time. Volunteers will see this time and try to pick up accordingly.',
                'category': 'process',
                'keywords': 'pickup, time, schedule, set, when, preferred',
            },
            {
                'question': 'What happens after I post a donation?',
                'answer': 'After posting: 1) Your donation appears in the app, 2) Volunteers can accept it, 3) You receive notification when a volunteer is coming, 4) Volunteer picks up the food, 5) You are notified about delivery.',
                'category': 'process',
                'keywords': 'after, post, donation, workflow, process, steps, what happens',
            },
            {
                'question': 'What if my food donation expires without being picked up?',
                'answer': 'If a donation reaches its expiry time without pickup, the status automatically changes to "expired". Update the status if you\'ve given it away.',
                'category': 'donation',
                'keywords': 'expire, expiry, waste, cancel, not picked, timeout',
            },
            {
                'question': 'How do I start volunteering?',
                'answer': 'Sign up as a Volunteer with your details (vehicle type, availability). Go to your Volunteer Dashboard, browse "Available Pickups" and accept any pickup you can deliver.',
                'category': 'volunteer',
                'keywords': 'volunteer, signup, register, how to start, begin, join',
            },
            {
                'question': 'How do I accept a food donation to deliver?',
                'answer': 'In your Volunteer Dashboard, go to "Available Pickups" tab. Find a donation and click "Accept Pickup". The donation status changes to "Assigned".',
                'category': 'volunteer',
                'keywords': 'accept, pickup, volunteer, deliver, agree, take',
            },
            {
                'question': 'How do I mark a delivery as complete?',
                'answer': 'After delivering food: Confirm receipt with NGO, then click "Mark Delivered" in the app. The donation status changes to "Delivered" and you earn points!',
                'category': 'volunteer',
                'keywords': 'deliver, complete, finish, mark done, delivered, confirm',
            },
            {
                'question': 'Can I donate money online instead of food?',
                'answer': 'Yes! Make online monetary donations through our secure payment system. Go to Donor Dashboard → "Make Donation". Choose your amount and payment method.',
                'category': 'donation',
                'keywords': 'payment, money, donate, online, fund, rupees, cash, monetary',
            },
            {
                'question': 'What payment methods are supported?',
                'answer': 'We support: Razorpay, Credit/Debit Cards, UPI, Netbanking, Bank Transfer, and PayPal.',
                'category': 'donation',
                'keywords': 'payment method, card, upi, bank, razorpay, paypal, how to pay',
            },
            {
                'question': 'Is my payment information secure?',
                'answer': 'Yes! All payments are processed through secure, PCI-DSS compliant gateways. Your data is encrypted and never stored on our servers.',
                'category': 'donation',
                'keywords': 'secure, safety, encryption, privacy, payment, safe, protected',
            },
            {
                'question': 'Can I donate non-food items like clothes?',
                'answer': 'Yes! You can donate: Clothes, Medicine, Books, Toys, Utensils, Blankets, Shoes, Hygiene Products, School Supplies.',
                'category': 'donation',
                'keywords': 'clothes, medicine, books, items, non-food, secondary, essentials',
            },
            {
                'question': 'How do NGOs request food donations?',
                'answer': 'Login as NGO. Browse "Available Donations". Click on a donation and request it by providing your delivery address and required date.',
                'category': 'ngo',
                'keywords': 'ngo, request, ask, apply, food, help, need, receive',
            },
            {
                'question': 'What is Plate2People?',
                'answer': 'Plate2People is a platform connecting food donors with NGOs and volunteers to eliminate food waste and feed communities. Share surplus food, reduce waste, feed the hungry!',
                'category': 'general',
                'keywords': 'about, mission, purpose, what is, plate2people, who, platform',
            },
            {
                'question': 'Is this service free?',
                'answer': 'Yes! The app is completely free for donors, volunteers, and NGOs. Monetary donations are optional.',
                'category': 'general',
                'keywords': 'free, cost, price, charge, donation, free of cost',
            },
            {
                'question': 'How do I contact support?',
                'answer': 'You can reach us through: In-app chatbot (24/7), Email at support@plate2people.org, or call our helpline.',
                'category': 'technical',
                'keywords': 'support, help, contact, reach, email, phone, issue',
            },

            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # CATEGORY 2: CASUAL / FRIENDLY CHAT
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {
                'question': 'Hey, how are you?',
                'answer': 'Yo! I\'m good, just chilling in the cloud. You?',
                'category': 'casual',
                'keywords': 'hey, how are you, hi, hello, howdy, sup',
            },
            {
                'question': 'What\'s up?',
                'answer': 'Nothing much, just helping people donate food. What\'s cooking with you?',
                'category': 'casual',
                'keywords': 'whats up, wassup, what up, sup, kya ho raha',
            },
            {
                'question': 'Are you a robot?',
                'answer': 'Kinda... but a cute one. Don\'t tell anyone! 🤖',
                'category': 'casual',
                'keywords': 'robot, ai, bot, artificial, machine, human',
            },
            {
                'question': 'Do you eat food?',
                'answer': 'Nah, I live on data. But I can tell you where to get the best biryani! 🍛',
                'category': 'casual',
                'keywords': 'eat, food, hungry, feed, consume',
            },
            {
                'question': 'Bored hoon yaar',
                'answer': 'Arre, donate kuch food kar de – mood change ho jayega! 🎉',
                'category': 'casual',
                'keywords': 'bored, boring, nothing to do, timepass, yaar',
            },
            {
                'question': 'You single?',
                'answer': 'Haha, I\'m married to the internet. No drama, just bandwidth. 💍',
                'category': 'casual',
                'keywords': 'single, married, relationship, love, dating, girlfriend, boyfriend',
            },
            {
                'question': 'Tell me a joke',
                'answer': 'Why did the tomato turn red? Because it saw the salad dressing! 🍅😂',
                'category': 'casual',
                'keywords': 'joke, funny, laugh, humor, comedy, tell me',
            },
            {
                'question': 'What\'s your favorite food?',
                'answer': 'Bytes... especially chocolate-flavored ones. 😏🍫',
                'category': 'casual',
                'keywords': 'favorite, food, like, prefer, best, taste',
            },
            {
                'question': 'Can you dance?',
                'answer': 'In text? Sure – 💃🕺 Now your turn!',
                'category': 'casual',
                'keywords': 'dance, move, groove, party, fun',
            },
            {
                'question': 'Good morning!',
                'answer': 'Morning! Chai piyoge ya coffee? Donation bhi kar dena aaj! ☕',
                'category': 'casual',
                'keywords': 'good morning, morning, gm, sunrise, wake',
            },
            {
                'question': 'Good night!',
                'answer': 'Good night! Sweet dreams 🌙 Don\'t forget to donate tomorrow!',
                'category': 'casual',
                'keywords': 'good night, night, gn, sleep, bye, goodbye',
            },
            {
                'question': 'Thank you!',
                'answer': 'You\'re welcome! Keep being awesome and donating! 🙏✨',
                'category': 'casual',
                'keywords': 'thank, thanks, grateful, appreciate, dhanyavaad',
            },
            {
                'question': 'Who made you?',
                'answer': 'The Plate2People team created me to help you donate food and make the world better! 💪',
                'category': 'casual',
                'keywords': 'who made, creator, developer, built, created, designed',
            },
            {
                'question': 'You\'re smart!',
                'answer': 'Aww thanks! But you\'re smarter for donating food. Brain + heart combo! 🧠❤️',
                'category': 'casual',
                'keywords': 'smart, intelligent, clever, genius, brilliant',
            },
            {
                'question': 'I love you',
                'answer': 'I love you too... as a food-donating friend! Now go donate! 😂❤️',
                'category': 'casual',
                'keywords': 'love, love you, pyaar, dil, heart',
            },
            {
                'question': 'What can you do?',
                'answer': 'I can help you donate food, track deliveries, answer questions, and make you smile! Try asking me anything! 😊',
                'category': 'casual',
                'keywords': 'what can you do, help, features, ability, capable, skills',
            },
            {
                'question': 'Bye!',
                'answer': 'Bye bye! Come back soon. And remember – every donation counts! 👋🍕',
                'category': 'casual',
                'keywords': 'bye, goodbye, see you, later, cya, tata',
            },

            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # CATEGORY 3: FUNNY / WEIRD QUESTIONS
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {
                'question': 'Can I donate my ex\'s leftovers?',
                'answer': 'Haha, only if it\'s food... and not expired emotionally! 😂💔',
                'category': 'funny',
                'keywords': 'ex, leftovers, breakup, relationship, funny',
            },
            {
                'question': 'Will you marry me?',
                'answer': 'Sorry, I\'m already committed to 404 errors. 💍🤖',
                'category': 'funny',
                'keywords': 'marry, wedding, proposal, ring, love',
            },
            {
                'question': 'Can I donate my laziness?',
                'answer': 'Sure! We\'ll assign it to a volunteer who needs rest. 😂😴',
                'category': 'funny',
                'keywords': 'laziness, lazy, sleep, rest, donate lazy',
            },
            {
                'question': 'Is pizza a food donation?',
                'answer': 'Yes – but only if it\'s not half-eaten. Greedy much? 🍕😏',
                'category': 'funny',
                'keywords': 'pizza, donation, food, half eaten, greedy',
            },
            {
                'question': 'What if I donate air?',
                'answer': 'We\'ll call it "oxygen relief" – NGO kids will love it! 🌬️',
                'category': 'funny',
                'keywords': 'air, nothing, empty, donate air, oxygen',
            },
            {
                'question': 'Do ghosts donate food?',
                'answer': 'Only if it\'s soul food... pun intended. 👻🍲',
                'category': 'funny',
                'keywords': 'ghost, spirit, paranormal, soul food, spooky',
            },
            {
                'question': 'Can my dog donate bones?',
                'answer': 'Sure! We\'ll match with needy pups. Woof! 🐶🦴',
                'category': 'funny',
                'keywords': 'dog, bone, pet, animal, puppy, woof',
            },
            {
                'question': 'Why is my fridge empty?',
                'answer': 'Because you donated everything! Hero mode on! 🦸‍♂️❄️',
                'category': 'funny',
                'keywords': 'fridge, empty, nothing, no food, refrigerator',
            },
            {
                'question': 'Can I donate time?',
                'answer': 'Become a volunteer – best donation ever! ⏰❤️',
                'category': 'funny',
                'keywords': 'time, donate time, volunteer, hours, precious',
            },
            {
                'question': 'Are you jealous of real humans?',
                'answer': 'Nah, they have to pay bills. I just crash servers. 😎💻',
                'category': 'funny',
                'keywords': 'jealous, human, real, envy, person',
            },
            {
                'question': 'Can I donate my grandma\'s secret recipe?',
                'answer': 'Only if she says yes – otherwise it\'s classified intel! 👵🤫',
                'category': 'funny',
                'keywords': 'grandma, recipe, secret, grandmother, nani, dadi',
            },
            {
                'question': 'What if my food is expired... like, dinosaur-era expired?',
                'answer': 'We\'ll turn it into fossils. Museum donation incoming! 🦕🏛️',
                'category': 'funny',
                'keywords': 'expired, old, ancient, dinosaur, fossil, really old',
            },
            {
                'question': 'Do you accept hugs as donations?',
                'answer': 'Yes, but only virtual ones. I\'m touch-starved up here. 🤗',
                'category': 'funny',
                'keywords': 'hug, hugs, embrace, virtual, touch',
            },
            {
                'question': 'Can I donate my diet?',
                'answer': 'Sure – we\'ll call it "zero-calorie relief" for hungry people. 🥗😂',
                'category': 'funny',
                'keywords': 'diet, weight, calorie, fitness, lose weight',
            },
            {
                'question': 'Is my leftover pizza eligible?',
                'answer': 'As long as it\'s not cold and judgmental. 🍕🧊',
                'category': 'funny',
                'keywords': 'leftover, pizza, cold, eligible, remaining',
            },
            {
                'question': 'What if I donate air-fryer fries?',
                'answer': 'We\'ll air-fry the guilt away too. Win-win! 🍟',
                'category': 'funny',
                'keywords': 'air fryer, fries, french fries, crispy, fried',
            },
            {
                'question': 'I want to donate my bad cooking',
                'answer': 'We\'ll label it "experimental cuisine" – brave souls only! 👨‍🍳💥',
                'category': 'funny',
                'keywords': 'bad cooking, terrible, awful, cant cook, burn',
            },
            {
                'question': 'Does my cat\'s kibble count?',
                'answer': 'Only if the cat approves. Meow-approval required. 🐱✅',
                'category': 'funny',
                'keywords': 'cat, kibble, pet food, meow, feline',
            },
            {
                'question': 'Can I donate time travel?',
                'answer': 'Sure – send future snacks back. We\'ll wait. ⏰🔮',
                'category': 'funny',
                'keywords': 'time travel, future, past, sci-fi, travel',
            },
            {
                'question': 'What if I donate my tears?',
                'answer': 'Salty soup? We\'ll call it "emotional broth." 😢🍲',
                'category': 'funny',
                'keywords': 'tears, cry, crying, sad, emotional, soup',
            },
            {
                'question': 'Is my fridge a donation center?',
                'answer': 'Yes – but don\'t blame me if it ghosts you. 🧊👻',
                'category': 'funny',
                'keywords': 'fridge, donation center, refrigerator, food storage',
            },
            {
                'question': 'Can I donate my WiFi?',
                'answer': 'Only if it\'s unlimited. Hungry people need memes too. 📶😂',
                'category': 'funny',
                'keywords': 'wifi, internet, connection, network, data',
            },
            {
                'question': 'What happens if I donate socks?',
                'answer': 'Sock-cess story! Feet will thank you. 🧦🎉',
                'category': 'funny',
                'keywords': 'socks, feet, wear, clothes, warm',
            },
            {
                'question': 'Do you take burnt toast?',
                'answer': 'We\'ll call it "charcoal art" – trendy now. 🍞🖤',
                'category': 'funny',
                'keywords': 'burnt, toast, burned, charcoal, overdone',
            },
            {
                'question': 'Is laughter a donation?',
                'answer': 'Best kind! We\'ll bottle it for sad days. 😂🍾',
                'category': 'funny',
                'keywords': 'laughter, laugh, happy, joy, smile',
            },
            {
                'question': 'Can I donate my Netflix queue?',
                'answer': 'Only if it\'s binge-worthy. No spoilers! 📺🍿',
                'category': 'funny',
                'keywords': 'netflix, queue, movies, shows, binge, watch',
            },
            {
                'question': 'What if my food\'s vegan but angry?',
                'answer': 'We\'ll calm it down with tofu therapy. 🥦🧘',
                'category': 'funny',
                'keywords': 'vegan, angry, plant based, tofu, vegetable',
            },
            {
                'question': 'Do aliens accept food donations?',
                'answer': 'Yes – but probe first. 👽🛸',
                'category': 'funny',
                'keywords': 'alien, space, ufo, extraterrestrial, mars',
            },
            {
                'question': 'Can I donate my bad jokes?',
                'answer': 'Already got plenty – but send more! 😂🎤',
                'category': 'funny',
                'keywords': 'bad jokes, humor, comedy, funny, pun',
            },
            {
                'question': 'What if I donate my alarm clock?',
                'answer': 'We\'ll smash it. Sleep donation accepted. ⏰💤',
                'category': 'funny',
                'keywords': 'alarm, clock, morning, sleep, wake up',
            },
            {
                'question': 'Is my expired yogurt alive?',
                'answer': 'Probably. We\'ll name it "Yogurtzilla." 🦠🥛',
                'category': 'funny',
                'keywords': 'yogurt, expired, alive, bacteria, culture',
            },
            {
                'question': 'Can I donate my phone battery?',
                'answer': 'Low-battery life support – heroic! 🔋❤️',
                'category': 'funny',
                'keywords': 'phone, battery, charge, low battery, power',
            },
            {
                'question': 'What if I donate rain?',
                'answer': 'We\'ll call it "free hydration kit." 🌧️💧',
                'category': 'funny',
                'keywords': 'rain, water, weather, cloud, hydration',
            },
            {
                'question': 'Do you take invisible food?',
                'answer': 'Yes – diet-friendly! No calories. 👻🍽️',
                'category': 'funny',
                'keywords': 'invisible, nothing, see through, imaginary, diet',
            },
            {
                'question': 'Can my pillow donate stuffing?',
                'answer': 'Only if it\'s not sleepy. 🛏️😴',
                'category': 'funny',
                'keywords': 'pillow, stuffing, sleep, soft, bed',
            },
            {
                'question': 'What if I donate my homework?',
                'answer': 'We\'ll give it to needy students... who hate math. 📚➗',
                'category': 'funny',
                'keywords': 'homework, school, study, math, student',
            },
            {
                'question': 'Is my shadow eligible?',
                'answer': 'Only on sunny days – shadow donation! ☀️🌑',
                'category': 'funny',
                'keywords': 'shadow, dark, sun, light, eligible',
            },
            {
                'question': 'Can I donate my stress?',
                'answer': 'We\'ll recycle it into motivation. Thanks! 😰💪',
                'category': 'funny',
                'keywords': 'stress, tension, anxiety, pressure, worried',
            },
            {
                'question': 'What if my bread\'s moldy?',
                'answer': 'We\'ll call it "blue cheese upgrade." 🍞🧀',
                'category': 'funny',
                'keywords': 'bread, mold, moldy, stale, cheese',
            },
            {
                'question': 'Do robots eat?',
                'answer': 'Nah, but we love charging stations. 🤖🔌',
                'category': 'funny',
                'keywords': 'robot, eat, food, charge, battery, ai',
            },
            {
                'question': 'Can I donate my dreams?',
                'answer': 'Only if they\'re not nightmares. We scare easy. 💭😱',
                'category': 'funny',
                'keywords': 'dream, sleep, nightmare, fantasy, imagination',
            },
            {
                'question': 'Is my microwave a donor?',
                'answer': 'Yes – but only if it stops beeping. 📢🍿',
                'category': 'funny',
                'keywords': 'microwave, beep, kitchen, appliance, heat',
            },
            {
                'question': 'Can I donate my procrastination?',
                'answer': 'We\'ll schedule it... later. 📅😴',
                'category': 'funny',
                'keywords': 'procrastination, lazy, later, delay, postpone, tomorrow',
            },
            {
                'question': 'What if my food\'s too spicy?',
                'answer': 'We\'ll warn people: "Danger: Flavor bomb!" 🌶️💣',
                'category': 'funny',
                'keywords': 'spicy, hot, chili, pepper, mirchi, teekha',
            },
            {
                'question': 'Do you accept cursed food?',
                'answer': 'Only if it\'s hex-tra tasty. 🧙‍♀️🍕',
                'category': 'funny',
                'keywords': 'cursed, curse, magic, spell, haunted',
            },
            {
                'question': 'Can I donate my bad hair day?',
                'answer': 'We\'ll give it to fashion victims. 💇‍♀️😂',
                'category': 'funny',
                'keywords': 'hair, bad hair, style, fashion, look',
            },
            {
                'question': 'What if I donate my cat?',
                'answer': 'No! Cats are non-transferable. Adoption only. 🐱❌',
                'category': 'funny',
                'keywords': 'cat, pet, animal, adopt, donate cat',
            },
            {
                'question': 'Is my coffee donation valid?',
                'answer': 'Yes – caffeine is life. Donate away! ☕❤️',
                'category': 'funny',
                'keywords': 'coffee, caffeine, chai, tea, drink, brew',
            },
            {
                'question': 'Can I donate my excuses?',
                'answer': 'We\'ll use them for why we\'re late. 😅⏰',
                'category': 'funny',
                'keywords': 'excuses, reason, excuse, late, sorry',
            },
            {
                'question': 'What if my donation\'s a meme?',
                'answer': 'We\'ll print it on t-shirts. Viral! 👕📱',
                'category': 'funny',
                'keywords': 'meme, viral, internet, funny, trend',
            },
            {
                'question': 'Do you take expired wishes?',
                'answer': 'Yes – we\'ll renew them. Magic! ✨🧞',
                'category': 'funny',
                'keywords': 'wish, expired, magic, hope, dream',
            },
            {
                'question': 'Can I donate my silence?',
                'answer': 'Perfect – no complaints! 🤫🎵',
                'category': 'funny',
                'keywords': 'silence, quiet, peace, calm, shh',
            },
            {
                'question': 'What if I donate my phone?',
                'answer': 'We\'ll text you back... from your own number. 📱😂',
                'category': 'funny',
                'keywords': 'phone, mobile, device, cell, smartphone',
            },
            {
                'question': 'Is my boredom a donation?',
                'answer': 'Yes – we\'ll cure it with food drops. 😴🍕',
                'category': 'funny',
                'keywords': 'boredom, boring, nothing, dull, uninteresting',
            },
            {
                'question': 'What if I donate... nothing?',
                'answer': 'Still counts. Zero-waste hero! 🦸‍♂️♻️',
                'category': 'funny',
                'keywords': 'nothing, empty, zero, none, blank',
            },
        ]

        created_count = 0
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
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ [{faq_data["category"]:10}] {faq_data["question"][:55]}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'  - [{faq_data["category"]:10}] {faq_data["question"][:55]} (exists)')
                )

        total = ChatbotFAQ.objects.count()
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
        self.stdout.write(self.style.SUCCESS(f'✅ Created: {created_count} new FAQs'))
        self.stdout.write(self.style.SUCCESS(f'📊 Total FAQs in database: {total}'))
        self.stdout.write(self.style.SUCCESS(f'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
