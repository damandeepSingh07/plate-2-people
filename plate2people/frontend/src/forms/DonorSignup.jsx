import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import OTPVerificationStep from '../components/OTPVerificationStep'
import '../pages/Auth.css'

export default function DonorSignup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', address: '',
    role: 'donor',
    organization_name: '',
  })
  const [errors, setErrors] = useState({})
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
      // If backend sends requires_otp, show otp dialog
      if (data.requires_otp) {
        setPendingEmail(form.email)
        setShowOTP(true)
        // Store tokens temporarily so axios can make the verify-otp call
        if (data.tokens) {
          localStorage.setItem('access_token', data.tokens.access)
          localStorage.setItem('refresh_token', data.tokens.refresh)
        }
      } else {
        login(data.tokens, data.user)
        navigate('/dashboard/donor')
      }
    } catch (err) {
      setErrors(err.response?.data || { general: 'Signup failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerified = (tokens, user) => {
    login(tokens, user)
    navigate('/dashboard/donor')
  }

  const handleOTPSkip = () => {
    navigate('/dashboard/donor')
  }

  return (
    <div className="auth-page">
      <Navbar />

      {/* OTP Modal overlay */}
      {showOTP && (
        <OTPVerificationStep
          email={pendingEmail}
          onVerified={handleOTPVerified}
          onSkip={handleOTPSkip}
        />
      )}

      <div className="auth-container auth-container--wide">
        <div className="auth-card card fade-up" style={{ maxWidth: 600 }}>
          <Link to="/signup" className="back-link">← Back to role selection</Link>
          <div className="auth-header">
            <span className="auth-emoji">🍱</span>
            <h1 className="auth-title">Sign Up as Donor</h1>
            <p className="auth-subtitle">Share your surplus food and reduce waste</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <p className="form-section-title">Personal Information</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input name="name" className="form-input" placeholder="John Doe"
                  value={form.name} onChange={handleChange} required />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input name="phone" className="form-input" placeholder="+91 98765 43210"
                  value={form.phone} onChange={handleChange} required />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
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
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address *</label>
              <textarea name="address" className="form-input" placeholder="Your full address"
                value={form.address} onChange={handleChange} rows={2} required />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            <p className="form-section-title">Donor Details</p>
            <div className="form-group">
              <label className="form-label">Organisation / Restaurant Name</label>
              <input name="organization_name" className="form-input"
                placeholder="e.g. Sharma's Kitchen, ABC Hotel (optional)"
                value={form.organization_name} onChange={handleChange} />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Donor Account →'}
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
