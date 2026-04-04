import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import './Auth.css'

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState('login') // login, forgot, otp-verify, reset-password
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
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/login/', form)
      login(data.tokens, data.user)
      const map = { donor: '/dashboard/donor', volunteer: '/dashboard/volunteer', ngo: '/dashboard/ngo' }
      navigate(map[data.user.role] || '/dashboard')
    } catch (err) {
      const d = err.response?.data
      if (d?.non_field_errors) setError(d.non_field_errors[0])
      else setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/forgot-password/', { email: resetForm.email })
      setSuccess('OTP sent to your email!')
      setStep('otp-verify')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/verify-otp/', { email: resetForm.email, otp: resetForm.otp })
      setSuccess('OTP verified! Now set your new password.')
      setStep('reset-password')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (resetForm.new_password !== resetForm.confirm_password) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
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
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // This will be implemented with actual Google OAuth flow
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID
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
      <div className="auth-container">
        <motion.div
          className="auth-card modern-auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {step === 'login' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-header">
                <div className="auth-emoji-large">👋</div>
                <h1 className="auth-title-large">Welcome back</h1>
                <p className="auth-subtitle-large">Sign in to continue making a difference</p>
              </div>

              <form onSubmit={handleSignIn} className="modern-form">
                {error && (
                  <motion.div
                    className="form-alert error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="modern-form-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </motion.div>

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="modern-form-input"
                    placeholder="Your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  className="modern-btn primary"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? '⏳ Signing in...' : '→ Sign In'}
                </motion.button>
              </form>

              <div className="divider-modern">Or</div>

              <motion.button
                onClick={handleGoogleSignIn}
                className="modern-btn google"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="google-icon">🔵</span> Continue with Google
              </motion.button>

              <div className="auth-links">
                <button
                  onClick={() => setStep('forgot')}
                  className="auth-link-modern"
                >
                  Forgot password?
                </button>
                <span>•</span>
                <Link to="/signup" className="auth-link-modern">
                  Create account
                </Link>
              </div>
            </motion.div>
          )}

          {step === 'forgot' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-header">
                <div className="auth-emoji-large">🔐</div>
                <h1 className="auth-title-large">Forgot Password?</h1>
                <p className="auth-subtitle-large">Enter your email to reset your password</p>
              </div>

              <form onSubmit={handleForgotPassword} className="modern-form">
                {error && (
                  <motion.div
                    className="form-alert error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="form-alert success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ✓ {success}
                  </motion.div>
                )}

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">Email Address</label>
                  <input
                    type="email"
                    className="modern-form-input"
                    placeholder="you@example.com"
                    value={resetForm.email}
                    onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                    required
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  className="modern-btn primary"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? '⏳ Sending OTP...' : '→ Send OTP'}
                </motion.button>
              </form>

              <button
                onClick={() => setStep('login')}
                className="btn-back-modern"
              >
                ← Back to sign in
              </button>
            </motion.div>
          )}

          {step === 'otp-verify' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-header">
                <div className="auth-emoji-large">📩</div>
                <h1 className="auth-title-large">Verify OTP</h1>
                <p className="auth-subtitle-large">Enter the OTP sent to {resetForm.email}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="modern-form">
                {error && (
                  <motion.div
                    className="form-alert error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="form-alert success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ✓ {success}
                  </motion.div>
                )}

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">One-Time Password (OTP)</label>
                  <input
                    type="text"
                    className="modern-form-input otp-input"
                    placeholder="Enter 6-digit OTP"
                    value={resetForm.otp}
                    onChange={(e) => setResetForm({ ...resetForm, otp: e.target.value })}
                    maxLength="6"
                    required
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  className="modern-btn primary"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? '⏳ Verifying...' : '→ Verify OTP'}
                </motion.button>
              </form>

              <button
                onClick={() => setStep('forgot')}
                className="btn-back-modern"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {step === 'reset-password' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="auth-header">
                <div className="auth-emoji-large">🔑</div>
                <h1 className="auth-title-large">Set New Password</h1>
                <p className="auth-subtitle-large">Create a strong new password</p>
              </div>

              <form onSubmit={handleResetPassword} className="modern-form">
                {error && (
                  <motion.div
                    className="form-alert error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="form-alert success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ✓ {success}
                  </motion.div>
                )}

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">New Password</label>
                  <input
                    type="password"
                    className="modern-form-input"
                    placeholder="Min 6 characters"
                    value={resetForm.new_password}
                    onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                    required
                  />
                </motion.div>

                <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
                  <label className="modern-form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="modern-form-input"
                    placeholder="Re-enter password"
                    value={resetForm.confirm_password}
                    onChange={(e) => setResetForm({ ...resetForm, confirm_password: e.target.value })}
                    required
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  className="modern-btn primary"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? '⏳ Resetting...' : '✓ Reset Password'}
                </motion.button>
              </form>

              <button
                onClick={() => setStep('forgot')}
                className="btn-back-modern"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
