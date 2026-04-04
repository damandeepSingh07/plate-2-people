import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import './Auth.css'

const BRAND_STATS = [
  { icon: '🍱', num: '12,000+', label: 'Meals shared' },
  { icon: '🚴', num: '500+',    label: 'Active volunteers' },
  { icon: '🏢', num: '80+',     label: 'NGO partners' },
]

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState('login') // login | forgot | otp-verify | reset-password
  const [form, setForm] = useState({ email: '', password: '' })
  const [resetForm, setResetForm] = useState({ email: '', otp: '', new_password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setError('')
  }
  const handleResetChange = (e) => {
    const { name, value } = e.target
    setResetForm({ ...resetForm, [name]: value })
    setError('')
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/login/', form)
      login(data.tokens, data.user)
      const map = { donor: '/dashboard/donor', volunteer: '/dashboard/volunteer', ngo: '/dashboard/ngo' }
      navigate(map[data.user.role] || '/dashboard')
    } catch (err) {
      const d = err.response?.data
      if (d?.non_field_errors) setError(d.non_field_errors[0])
      else setError('Invalid email or password. Please try again.')
    } finally { setLoading(false) }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/forgot-password/', { email: resetForm.email })
      setSuccess('OTP sent to your email!')
      setStep('otp-verify')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/verify-otp/', { email: resetForm.email, otp: resetForm.otp })
      setSuccess('OTP verified! Now set your new password.')
      setStep('reset-password')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (resetForm.new_password !== resetForm.confirm_password) return setError('Passwords do not match')
    setLoading(true); setError('')
    try {
      await api.post('/reset-password/', {
        email: resetForm.email,
        otp: resetForm.otp,
        new_password: resetForm.new_password
      })
      setSuccess('Password reset successful! Signing you in...')
      setTimeout(() => setStep('login'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed')
    } finally { setLoading(false) }
  }

  const handleGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/auth/google`
    if (clientId) {
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`
    } else {
      setError('Google Sign-In is not configured')
    }
  }

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-split">

        {/* ── Brand Panel ── */}
        <div className="auth-brand-panel">
          <div className="brand-panel-content">
            <div className="brand-panel-logo">
              <div className="brand-panel-icon">🍽</div>
              <span className="brand-panel-name">Plate<span>2</span>People</span>
            </div>

            <span className="brand-tagline">Welcome back!</span>
            <h2 className="brand-headline">
              Continue making<br />
              <em>a difference</em>
            </h2>
            <p className="brand-sub">
              Sign in to your account and get back to connecting food with people who need it most.
            </p>

            <div className="brand-stats">
              {BRAND_STATS.map((s, i) => (
                <div key={i} className="brand-stat">
                  <div className="brand-stat-icon">{s.icon}</div>
                  <div>
                    <div className="brand-stat-num">{s.num}</div>
                    <div className="brand-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── Login form ── */}
              {step === 'login' && (
                <>
                  <div className="auth-form-header">
                    <span className="auth-form-emoji">👋</span>
                    <h1 className="auth-form-title">Welcome back</h1>
                    <p className="auth-form-sub">Sign in to continue making a difference</p>
                  </div>

                  <form onSubmit={handleSignIn} className="modern-form">
                    {error && (
                      <motion.div className="form-alert error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                        ⚠️ {error}
                      </motion.div>
                    )}

                    <div className="modern-form-group">
                      <label className="modern-form-label">Email Address</label>
                      <input
                        type="email" name="email"
                        className="modern-form-input"
                        placeholder="you@example.com"
                        value={form.email} onChange={handleChange} required
                      />
                    </div>

                    <div className="modern-form-group">
                      <label className="modern-form-label">Password</label>
                      <input
                        type="password" name="password"
                        className="modern-form-input"
                        placeholder="Your password"
                        value={form.password} onChange={handleChange} required
                      />
                    </div>

                    <button type="submit" className="modern-btn primary" disabled={loading}>
                      {loading ? '⏳ Signing in…' : '→ Sign In'}
                    </button>
                  </form>

                  <div className="divider-modern" style={{ margin: '24px 0' }}>or</div>

                  <button onClick={handleGoogleSignIn} className="modern-btn google">
                    <span className="google-icon">🔵</span> Continue with Google
                  </button>

                  <div className="auth-links">
                    <button onClick={() => setStep('forgot')} className="auth-link-modern">
                      Forgot password?
                    </button>
                    <span style={{ color: '#d1d5db' }}>·</span>
                    <Link to="/signup" className="auth-link-modern">Create account</Link>
                  </div>
                </>
              )}

              {/* ── Forgot password ── */}
              {step === 'forgot' && (
                <>
                  <div className="auth-form-header">
                    <span className="auth-form-emoji">🔐</span>
                    <h1 className="auth-form-title">Forgot Password?</h1>
                    <p className="auth-form-sub">Enter your email and we'll send you a reset code</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="modern-form">
                    {error && <div className="form-alert error">⚠️ {error}</div>}
                    {success && <div className="form-alert success">✓ {success}</div>}
                    <div className="modern-form-group">
                      <label className="modern-form-label">Email Address</label>
                      <input type="email" className="modern-form-input" placeholder="you@example.com"
                        value={resetForm.email} onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} required />
                    </div>
                    <button type="submit" className="modern-btn primary" disabled={loading}>
                      {loading ? '⏳ Sending OTP…' : '→ Send OTP'}
                    </button>
                  </form>
                  <button onClick={() => setStep('login')} className="btn-back-modern">← Back to sign in</button>
                </>
              )}

              {/* ── OTP verify ── */}
              {step === 'otp-verify' && (
                <>
                  <div className="auth-form-header">
                    <span className="auth-form-emoji">📩</span>
                    <h1 className="auth-form-title">Verify OTP</h1>
                    <p className="auth-form-sub">Enter the OTP sent to <strong>{resetForm.email}</strong></p>
                  </div>
                  <form onSubmit={handleVerifyOTP} className="modern-form">
                    {error && <div className="form-alert error">⚠️ {error}</div>}
                    {success && <div className="form-alert success">✓ {success}</div>}
                    <div className="modern-form-group">
                      <label className="modern-form-label">One-Time Password (OTP)</label>
                      <input type="text" className="modern-form-input otp-input"
                        placeholder="Enter 6-digit OTP"
                        value={resetForm.otp}
                        onChange={(e) => setResetForm({ ...resetForm, otp: e.target.value })}
                        maxLength="6" required />
                    </div>
                    <button type="submit" className="modern-btn primary" disabled={loading}>
                      {loading ? '⏳ Verifying…' : '→ Verify OTP'}
                    </button>
                  </form>
                  <button onClick={() => setStep('forgot')} className="btn-back-modern">← Back</button>
                </>
              )}

              {/* ── Reset password ── */}
              {step === 'reset-password' && (
                <>
                  <div className="auth-form-header">
                    <span className="auth-form-emoji">🔑</span>
                    <h1 className="auth-form-title">Set New Password</h1>
                    <p className="auth-form-sub">Create a strong new password</p>
                  </div>
                  <form onSubmit={handleResetPassword} className="modern-form">
                    {error && <div className="form-alert error">⚠️ {error}</div>}
                    {success && <div className="form-alert success">✓ {success}</div>}
                    <div className="modern-form-group">
                      <label className="modern-form-label">New Password</label>
                      <input type="password" className="modern-form-input" placeholder="Min 6 characters"
                        value={resetForm.new_password}
                        onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })} required />
                    </div>
                    <div className="modern-form-group">
                      <label className="modern-form-label">Confirm Password</label>
                      <input type="password" className="modern-form-input" placeholder="Re-enter password"
                        value={resetForm.confirm_password}
                        onChange={(e) => setResetForm({ ...resetForm, confirm_password: e.target.value })} required />
                    </div>
                    <button type="submit" className="modern-btn primary" disabled={loading}>
                      {loading ? '⏳ Resetting…' : '✓ Reset Password'}
                    </button>
                  </form>
                  <button onClick={() => setStep('forgot')} className="btn-back-modern">← Back</button>
                </>
              )}
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  )
}
