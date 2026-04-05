import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Home.css'

/* ── Stats data ─────────────────────────────────────────────── */
const STATS = [
  { icon: '🍱', label: 'Meals Shared',    color: '#f97316' },
  { icon: '❤️',  label: 'Active Donors',   color: '#f43f5e' },
  { icon: '🏢', label: 'NGO Partners',    color: '#7c3aed' },
  { icon: '🚴', label: 'Volunteers',       color: '#16a34a' },
]

function StatCard({ stat, index }) {
  return (
    <div className="stat-card fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <span className="stat-icon" style={{ backgroundColor: stat.color + '18' }}>{stat.icon}</span>
      <span className="stat-label" style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>{stat.label}</span>
      <span className="stat-label" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' }}>Growing every day</span>
    </div>
  )
}

/* ── How it works steps ─────────────────────────────────────── */
const STEPS = [
  {
    step: '01', icon: '🍱', title: 'Donors List Food',
    desc: 'Restaurants, households & events post surplus food with location and quantity.',
    color: '#fff7ed', border: '#fed7aa', tag: 'For Donors',
  },
  {
    step: '02', icon: '🏢', title: 'NGOs Request',
    desc: 'Verified NGOs browse live listings and request food for their beneficiaries.',
    color: '#fdf4ff', border: '#e9d5ff', tag: 'For NGOs',
  },
  {
    step: '03', icon: '🚴', title: 'Volunteers Deliver',
    desc: 'Community volunteers pick up food and deliver it where it matters most.',
    color: '#f0fdf4', border: '#bbf7d0', tag: 'For Volunteers',
  },
]

/* ── Testimonials ───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "We used to throw away 30kg of food every night. Now it reaches families within hours. Plate2People changed how we see waste.",
    name: "Priya Sharma",
    role: "Restaurant Owner — Donor",
    avatar: "PS",
    color: "#f97316",
  },
  {
    quote: "Our shelter serves 200 meals a day. Plate2People gives us consistent, quality donations — without the uncertainty.",
    name: "Rahul Mehta",
    role: "NGO Director — Hope Foundation",
    avatar: "RM",
    color: "#7c3aed",
  },
  {
    quote: "I deliver for 2 hours on weekends. Knowing I've helped prevent hunger — that's more rewarding than any paycheck.",
    name: "Anjali Verma",
    role: "Volunteer — Mumbai Chapter",
    avatar: "AV",
    color: "#16a34a",
  },
]

/* ── Role Cards ─────────────────────────────────────────────── */
const ROLES = [
  {
    key: 'donor',
    emoji: '🍱',
    title: 'Food Donor',
    subtitle: 'Restaurants · Events · Households',
    desc: 'Have surplus food? List it in minutes and watch it reach someone who needs it.',
    gradient: 'linear-gradient(135deg, #ff9a3c 0%, #e0522a 100%)',
    lightBg: '#fff7ed',
    border: '#fed7aa',
    cta: 'Join as Donor',
  },
  {
    key: 'volunteer',
    emoji: '🚴',
    title: 'Delivery Volunteer',
    subtitle: 'Delivery Heroes · Logistics',
    desc: 'Be the bridge between excess and need. A few hours a week makes a real impact.',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
    lightBg: '#f0fdf4',
    border: '#bbf7d0',
    cta: 'Become a Volunteer',
  },
  {
    key: 'ngo',
    emoji: '🏢',
    title: 'NGO / Shelter',
    subtitle: 'Organisations · Shelters · Schools',
    desc: 'Request verified food donations for your community and manage distributions.',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    lightBg: '#fdf4ff',
    border: '#e9d5ff',
    cta: 'Register Your NGO',
  },
]

/* ── Floating food emojis ──────────────────────────────────── */
const FOODS = ['🥘','🥗','🍞','🥛','🍎','🥕','🧆','🍛','🫓','🍜']

export default function Home() {
  return (
    <div className="home">
      <Navbar />

      {/* ── HERO ─────────────────────────────────── */}
      <section className="hero">
        {/* Mesh gradient background */}
        <div className="hero-mesh">
          <div className="mesh-blob mesh-1" />
          <div className="mesh-blob mesh-2" />
          <div className="mesh-blob mesh-3" />
        </div>

        {/* Floating foods */}
        <div className="floating-foods" aria-hidden="true">
          {FOODS.map((emoji, i) => (
            <span
              key={i}
              className="food-particle"
              style={{
                left: `${5 + i * 9.5}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${5 + (i % 4)}s`,
                fontSize: `${1.2 + (i % 3) * 0.4}rem`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        <div className="container hero-content">
          {/* Pill tag */}
          <div className="hero-pill fade-up">
            <span className="pill-dot" /> 🌱 Zero Food Waste. Maximum Impact.
          </div>

          {/* Heading */}
          <h1 className="hero-title fade-up" style={{ animationDelay: '0.1s' }}>
            Every Plate Has a<br />
            <span className="gradient-text">Person Waiting</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle fade-up" style={{ animationDelay: '0.2s' }}>
            Plate2People connects food donors with NGOs and volunteers to ensure
            surplus food reaches those who need it — <strong>fast and with dignity.</strong>
          </p>

          {/* CTAs */}
          <div className="hero-cta fade-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/signup" className="btn btn-primary btn-lg hero-cta-primary">
              Start Donating Free →
            </Link>
            <Link to="/signin" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>

          {/* Social proof */}
          <div className="hero-social-proof fade-up" style={{ animationDelay: '0.42s' }}>
            <div className="proof-avatars">
              {['P','R','A','M','K'].map((l, i) => (
                <div key={i} className="proof-avatar" style={{
                  background: ['#f97316','#7c3aed','#f43f5e','#16a34a','#f59e0b'][i]
                }}>{l}</div>
              ))}
            </div>
            <p className="proof-text">
              Join our growing community of food heroes
            </p>
          </div>
        </div>

        {/* Down arrow */}
        <div className="hero-scroll-hint" aria-hidden="true">
          <div className="scroll-arrow">↓</div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────── */}
      <section className="stats-section">
        <div className="stats-grid container">
          {STATS.map((s, i) => (
            <StatCard key={i} stat={s} index={i} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className="how-section section-pad">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Simple Process</span>
            <h2 className="section-title">How Plate2People Works</h2>
            <p className="section-sub">From listing to delivery in three effortless steps</p>
          </div>

          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="step-card fade-up" style={{
                animationDelay: `${i * 0.12}s`,
                background: s.color,
                borderColor: s.border,
              }}>
                <div className="step-top">
                  <span className="step-tag">{s.tag}</span>
                  <span className="step-num">{s.step}</span>
                </div>
                <span className="step-icon">{s.icon}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE CARDS ─────────────────────────────── */}
      <section className="roles-section section-pad">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Choose Your Path</span>
            <h2 className="section-title">Find Your Role</h2>
            <p className="section-sub">Join thousands already making a difference in their community</p>
          </div>

          <div className="roles-grid">
            {ROLES.map((r, i) => (
              <Link key={r.key} to={`/signup/ngo` !== `/signup/${r.key}` ? `/signup` : '/signup'} className="role-card fade-up" style={{
                animationDelay: `${i * 0.1}s`,
                background: r.lightBg,
                borderColor: r.border,
              }}>
                <div className="role-icon-wrap" style={{ background: r.gradient }}>
                  <span>{r.emoji}</span>
                </div>
                <div className="role-content">
                  <p className="role-subtitle">{r.subtitle}</p>
                  <h3 className="role-title">{r.title}</h3>
                  <p className="role-desc">{r.desc}</p>
                </div>
                <div className="role-cta" style={{ background: r.gradient }}>
                  {r.cta} →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section className="testimonials-section section-pad">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Real Impact</span>
            <h2 className="section-title">Stories from the Community</h2>
            <p className="section-sub">Real people. Real change.</p>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card fade-up" style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="testimonial-quote-icon">"</div>
                <p className="testimonial-text">{t.quote}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <strong className="author-name">{t.name}</strong>
                    <span className="author-role">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────── */}
      <section className="cta-banner">
        <div className="cta-glow" />
        <div className="container cta-content">
          <span className="cta-eyebrow">Join the Movement</span>
          <h2 className="cta-title">Ready to make a difference?</h2>
          <p className="cta-sub">
            Join thousands of donors, volunteers, and NGOs already using Plate2People<br />
            to reduce waste and feed communities.
          </p>
          <Link to="/signup" className="btn btn-lg cta-btn">
            Get Started — It's Free →
          </Link>
          <p className="cta-note">No credit card required · Takes 2 minutes</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span>🍽</span>
            </div>
            <div>
              <p className="footer-logo-name">Plate<span>2</span>People</p>
              <p className="footer-tagline">Zero Waste. Maximum Impact.</p>
            </div>
          </div>

          <div className="footer-links">
            <Link to="/signup" className="footer-link">Get Started</Link>
            <Link to="/signin" className="footer-link">Sign In</Link>
            <a href="#how" className="footer-link">How It Works</a>
          </div>

          <p className="footer-copy">
            © 2025 Plate2People · Built with ❤️ to feed communities
          </p>
        </div>
      </footer>
    </div>
  )
}
