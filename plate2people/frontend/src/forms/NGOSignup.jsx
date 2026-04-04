import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import OTPVerificationStep from '../components/OTPVerificationStep'
import '../pages/Auth.css'

export default function NGOSignup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', address: '',
    role: 'ngo',
    ngo_registration_number: '',
    ngo_description: '',
    beneficiaries_count: '',
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
      const payload = { ...form, beneficiaries_count: form.beneficiaries_count || null }
      const { data } = await api.post('/signup/', payload)
      if (data.requires_otp) {
        setPendingEmail(form.email)
        setShowOTP(true)
        if (data.tokens) {
          localStorage.setItem('access_token', data.tokens.access)
          localStorage.setItem('refresh_token', data.tokens.refresh)
        }
      } else {
        login(data.tokens, data.user)
        navigate('/dashboard/ngo')
      }
    } catch (err) {
      setErrors(err.response?.data || { general: 'Signup failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerified = (tokens, user) => {
    login(tokens, user)
    navigate('/dashboard/ngo')
  }

  return (
    <div className="auth-page">
      <Navbar />
      {showOTP && (
        <OTPVerificationStep
          email={pendingEmail}
          onVerified={handleOTPVerified}
          onSkip={() => navigate('/dashboard/ngo')}
        />
      )}
      <div className="auth-container auth-container--wide">
        <div className="auth-card card fade-up" style={{ maxWidth: 620 }}>
          <Link to="/signup" className="back-link">← Back to role selection</Link>
          <div className="auth-header">
            <span className="auth-emoji">🏢</span>
            <h1 className="auth-title">Sign Up as NGO</h1>
            <p className="auth-subtitle">Register your organisation and request donations</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && <div className="auth-error">{errors.general}</div>}

            <p className="form-section-title">Organisation & Contact Info</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Organisation Name *</label>
                <input name="name" className="form-input" placeholder="Hope Foundation"
                  value={form.name} onChange={handleChange} required />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone *</label>
                <input name="phone" className="form-input" placeholder="+91 98765 43210"
                  value={form.phone} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" name="email" className="form-input" placeholder="info@ngo.org"
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
              <textarea name="address" className="form-input" placeholder="Office / distribution centre address"
                value={form.address} onChange={handleChange} rows={2} required />
            </div>

            <p className="form-section-title">NGO Details</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input name="ngo_registration_number" className="form-input" placeholder="NGO-123456"
                  value={form.ngo_registration_number} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Beneficiaries Served</label>
                <input type="number" name="beneficiaries_count" className="form-input"
                  placeholder="e.g. 500" min="1"
                  value={form.beneficiaries_count} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">About Your Organisation</label>
              <textarea name="ngo_description" className="form-input"
                placeholder="Briefly describe your NGO's mission and the communities you serve…"
                value={form.ngo_description} onChange={handleChange} rows={3} />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Creating Account…' : 'Register NGO Account →'}
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
