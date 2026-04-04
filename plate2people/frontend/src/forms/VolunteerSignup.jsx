import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import OTPVerificationStep from '../components/OTPVerificationStep'
import '../pages/Auth.css'

export default function VolunteerSignup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', address: '',
    role: 'volunteer',
    availability: '', vehicle_type: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const { data } = await api.post('/signup/', form)
      if (data.requires_otp) {
        setPendingEmail(form.email)
        setShowOTP(true)
        if (data.tokens) {
          localStorage.setItem('access_token', data.tokens.access)
          localStorage.setItem('refresh_token', data.tokens.refresh)
        }
      } else {
        login(data.tokens, data.user)
        navigate('/dashboard/volunteer')
      }
    } catch (err) {
      setErrors(err.response?.data || { general: 'Signup failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerified = (tokens, user) => {
    login(tokens, user)
    navigate('/dashboard/volunteer')
  }

  return (
    <div className="auth-page">
      <Navbar />
      {showOTP && (
        <OTPVerificationStep
          email={pendingEmail}
          onVerified={handleOTPVerified}
          onSkip={() => navigate('/dashboard/volunteer')}
        />
      )}
      <div className="auth-container auth-container--wide">
        <div className="auth-card card fade-up" style={{ maxWidth: 600 }}>
          <Link to="/signup" className="back-link">← Back to role selection</Link>
          <div className="auth-header">
            <span className="auth-emoji">🚴</span>
            <h1 className="auth-title">Sign Up as Volunteer</h1>
            <p className="auth-subtitle">Be the hero who delivers kindness</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <p className="form-section-title">Personal Information</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input name="name" className="form-input" placeholder="Jane Smith"
                  value={form.name} onChange={handleChange} required />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input name="phone" className="form-input" placeholder="+91 98765 43210"
                  value={form.phone} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" name="email" className="form-input" placeholder="you@example.com"
                  value={form.email} onChange={handleChange} required />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" name="password" className="form-input" placeholder="Min 6 characters"
                  value={form.password} onChange={handleChange} required minLength={6} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address *</label>
              <textarea name="address" className="form-input" placeholder="Your area / locality"
                value={form.address} onChange={handleChange} rows={2} required />
            </div>

            <p className="form-section-title">Volunteer Details</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Availability *</label>
                <select name="availability" className="form-input"
                  value={form.availability} onChange={handleChange} required>
                  <option value="">Select availability</option>
                  <option value="Weekdays Morning">Weekdays – Morning</option>
                  <option value="Weekdays Evening">Weekdays – Evening</option>
                  <option value="Weekends">Weekends Only</option>
                  <option value="Flexible">Flexible / Anytime</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select name="vehicle_type" className="form-input"
                  value={form.vehicle_type} onChange={handleChange}>
                  <option value="">Select vehicle</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Motorcycle">Motorcycle / Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Auto Rickshaw">Auto Rickshaw</option>
                  <option value="None">No vehicle (walking)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-green w-full" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Volunteer Account →'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/signin" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
