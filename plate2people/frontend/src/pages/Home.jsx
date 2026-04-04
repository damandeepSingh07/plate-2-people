import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Home.css'

const stats = [
  { number: '12K+', label: 'Meals Shared' },
  { number: '340+', label: 'Active Donors' },
  { number: '80+',  label: 'NGO Partners' },
  { number: '500+', label: 'Volunteers' },
]

const howItWorks = [
  { step: '01', icon: '🍱', title: 'Donors List Food', desc: 'Restaurants, events, and households post their surplus food with pickup details.' },
  { step: '02', icon: '🏢', title: 'NGOs Request',     desc: 'Verified NGOs browse listings and request food for their beneficiaries.' },
  { step: '03', icon: '🚴', title: 'Volunteers Deliver', desc: 'Community volunteers pick up the food and deliver it where it matters most.' },
]

export default function Home() {
  return (
    <div className="home">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <div className="container hero-content">
          <div className="hero-tag fade-up">🌱 Zero Food Waste. Maximum Impact.</div>
          <h1 className="hero-title fade-up" style={{ animationDelay: '0.1s' }}>
            Every Plate Has a<br />
            <em>Person Waiting</em>
          </h1>
          <p className="hero-subtitle fade-up" style={{ animationDelay: '0.2s' }}>
            Plate2People connects food donors with NGOs and volunteers to ensure
            surplus food reaches those who need it most — quickly and with dignity.
          </p>
          <div className="hero-cta fade-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
            <Link to="/signin" className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </div>

        {/* Floating food emojis */}
        <div className="floating-food" aria-hidden>
          {['🥘','🥗','🍞','🥛','🍎','🥕','🧆','🍛'].map((e, i) => (
            <span key={i} className="food-float" style={{
              left: `${8 + i * 12}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3 + (i % 3)}s`
            }}>{e}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="container stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="stat-card fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="stat-number">{s.number}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Simple Process</span>
            <h2 className="section-title">How Plate2People Works</h2>
          </div>
          <div className="steps-grid">
            {howItWorks.map((s, i) => (
              <div key={i} className="step-card card">
                <span className="step-number">{s.step}</span>
                <span className="step-icon">{s.icon}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to make a difference?</h2>
          <p className="cta-sub">Join thousands of donors, volunteers, and NGOs already using Plate2People.</p>
          <Link to="/signup" className="btn btn-primary btn-lg">Join the Movement →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-brand">🍽 Plate<span>2</span>People</span>
          <p className="footer-copy">© 2025 Plate2People. Built with ❤️ to feed communities.</p>
        </div>
      </footer>
    </div>
  )
}
