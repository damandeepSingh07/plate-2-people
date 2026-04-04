import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Auth.css'

// ── Animated role cards ───────────────────────────────────────────────────────
const ROLES = [
  {
    key: 'donor',
    emoji: '🍱',
    title: 'Donor',
    subtitle: 'Restaurants, households, events',
    desc: 'Share surplus food & reduce waste. Your generosity feeds communities.',
    gradient: 'linear-gradient(135deg, #ff9a3c 0%, #e0522a 100%)',
    ring: '#ff9a3c',
  },
  {
    key: 'volunteer',
    emoji: '🚴',
    title: 'Volunteer',
    subtitle: 'Delivery heroes',
    desc: 'Pick up and deliver food to those who need it most. Be the bridge of kindness.',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
    ring: '#22c55e',
  },
  {
    key: 'ngo',
    emoji: '🏢',
    title: 'NGO',
    subtitle: 'Organisations & shelters',
    desc: 'Request food donations for your beneficiaries and manage distributions.',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    ring: '#a78bfa',
  },
]

// ── 6-box OTP input component ─────────────────────────────────────────────────
function OTPBoxes({ value, onChange, disabled }) {
  const refs = useRef([])
  const digits = (value + '      ').slice(0, 6).split('')

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) refs.current[i - 1]?.focus()
    }
  }

  const handleInput = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1)
    if (!ch) return
    const arr = digits.map(d => d.trim())
    arr[i] = ch
    const next = arr.join('').slice(0, 6)
    onChange(next)
    if (i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste) { onChange(paste); refs.current[Math.min(paste.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handlePaste}>
      {[0,1,2,3,4,5].map(i => {
        const d = digits[i].trim()
        return (
          <input
            key={i}
            ref={el => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleInput(i, e)}
            onKeyDown={e => handleKey(i, e)}
            disabled={disabled}
            style={{
              width: 48, height: 56,
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              border: `2.5px solid ${d ? '#667eea' : '#d0d5e8'}`,
              borderRadius: 12,
              background: d ? '#f0f2ff' : '#fafbff',
              outline: 'none',
              transition: 'all 0.2s',
              color: '#1a1a2e',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Main SignUp component ──────────────────────────────────────────────────────
export default function SignUp() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // step: 'role' → 'details' → 'verify'
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingTokens, setPendingTokens] = useState(null)
  const [pendingUser, setPendingUser] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verified, setVerified] = useState(false)

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const validateDetails = () => {
    if (!form.name.trim())            return setError('Full name is required'), false
    if (!form.email.includes('@'))    return setError('Please enter a valid email'), false
    if (form.password.length < 6)     return setError('Password must be at least 6 characters'), false
    if (form.password !== form.confirm_password) return setError('Passwords do not match'), false
    return true
  }

  // Step 2 → 3: signup + auto-send OTP
  const handleSignupAndSendOTP = async e => {
    e.preventDefault()
    if (!validateDetails()) return

    setLoading(true)
    setError('')
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: selectedRole.key }
      const { data } = await api.post('/signup/', payload)

      // Store tokens for the verify step
      if (data.tokens) {
        setPendingTokens(data.tokens)
        localStorage.setItem('access_token', data.tokens.access)
        localStorage.setItem('refresh_token', data.tokens.refresh)
      }
      setPendingUser(data.user)
      setResendCooldown(60)
      setStep('verify')
      setSuccess(`OTP sent to ${form.email}. Check your terminal (dev mode).`)
    } catch (err) {
      const errData = err.response?.data
      if (errData?.email)    setError('Email: ' + (Array.isArray(errData.email) ? errData.email[0] : errData.email))
      else if (errData?.error) setError(errData.error)
      else setError('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/send-otp/', { email: form.email })
      setResendCooldown(60)
      setOtp('')
      setSuccess('New OTP sent! Check your terminal.')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  const handleVerify = async e => {
    e.preventDefault()
    if (otp.trim().length !== 6) return setError('Please enter all 6 digits.')
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/verify-otp/', { email: form.email, otp })
      setVerified(true)
      setSuccess('Email verified! Redirecting to your dashboard…')
      login(data.tokens || pendingTokens, data.user || pendingUser)
      setTimeout(() => navigate(`/dashboard/${selectedRole.key}`), 1200)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Try again.')
      setOtp('')
    } finally {
      setLoading(false)
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
          style={{ maxWidth: step === 'role' ? 560 : 480 }}
        >
          {/* ── Step 1: Role Selection ── */}
          <AnimatePresence mode="wait">
            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="auth-header">
                  <div className="auth-emoji-large">🚀</div>
                  <h1 className="auth-title-large">Join Plate2People</h1>
                  <p className="auth-subtitle-large">Choose your role to make a difference</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {ROLES.map((r, i) => (
                    <motion.button
                      key={r.key}
                      onClick={() => { setSelectedRole(r); setStep('details') }}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.35 }}
                      whileHover={{ scale: 1.025, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        padding: '20px 24px',
                        background: 'linear-gradient(135deg, #f8f9ff 0%, #eef0ff 100%)',
                        border: `2.5px solid #e0e4f8`,
                        borderRadius: 16,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.22s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = r.ring
                        e.currentTarget.style.background = `linear-gradient(135deg, #fff 0%, #f8f0ff 100%)`
                        e.currentTarget.style.boxShadow = `0 4px 20px ${r.ring}30`
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e0e4f8'
                        e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #eef0ff 100%)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Color accent bar */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: r.gradient, borderRadius: '16px 0 0 16px' }} />

                      {/* Emoji */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: r.gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.8rem', boxShadow: `0 4px 12px ${r.ring}40`,
                      }}>
                        {r.emoji}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1a1a2e', marginBottom: 2 }}>{r.title}</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{r.subtitle}</p>
                        <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5 }}>{r.desc}</p>
                      </div>

                      {/* Arrow */}
                      <span style={{ fontSize: '1.3rem', color: '#aaa', flexShrink: 0 }}>→</span>
                    </motion.button>
                  ))}
                </div>

                <p style={{ textAlign: 'center', marginTop: 28, color: '#888', fontSize: '0.9rem' }}>
                  Already have an account?{' '}
                  <Link to="/signin" style={{ color: '#667eea', fontWeight: 700, textDecoration: 'none' }}>Sign in here</Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: Details form ── */}
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="auth-header">
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 20px', borderRadius: 20, marginBottom: 16,
                    background: selectedRole?.gradient, color: '#fff',
                    fontWeight: 700, fontSize: '0.95rem',
                  }}>
                    {selectedRole?.emoji} {selectedRole?.title}
                  </div>
                  <h1 className="auth-title-large">Tell us about yourself</h1>
                  <p className="auth-subtitle-large">We'll create your account and send you an OTP</p>
                </div>

                <form onSubmit={handleSignupAndSendOTP} className="modern-form">
                  {error && (
                    <motion.div className="form-alert error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                      ⚠️ {error}
                    </motion.div>
                  )}

                  {[
                    { name: 'name',     label: 'Full Name',       type: 'text',     ph: 'John Doe' },
                    { name: 'email',    label: 'Email Address',   type: 'email',    ph: 'you@example.com' },
                    { name: 'password', label: 'Password',        type: 'password', ph: 'Min 6 characters' },
                    { name: 'confirm_password', label: 'Confirm Password', type: 'password', ph: 'Re-enter password' },
                  ].map(f => (
                    <div key={f.name} className="modern-form-group">
                      <label className="modern-form-label">{f.label}</label>
                      <input
                        type={f.type}
                        name={f.name}
                        className="modern-form-input"
                        placeholder={f.ph}
                        value={form[f.name]}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  ))}

                  <motion.button type="submit" className="modern-btn primary" disabled={loading} whileTap={{ scale: 0.98 }}>
                    {loading ? '⏳ Creating account…' : '→ Create Account & Send OTP'}
                  </motion.button>
                </form>

                <button onClick={() => { setStep('role'); setError('') }} className="btn-back-modern">
                  ← Back to role selection
                </button>
              </motion.div>
            )}

            {/* ── Step 3: OTP Verify ── */}
            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="auth-header">
                  <div className="auth-emoji-large" style={{ animation: 'none' }}>📧</div>
                  <h1 className="auth-title-large">Verify Your Email</h1>
                  <p className="auth-subtitle-large">
                    Enter the 6-digit code sent to<br />
                    <strong style={{ color: '#667eea' }}>{form.email}</strong>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 8 }}>
                    💡 In dev mode, check your Django terminal for the OTP code
                  </p>
                </div>

                <form onSubmit={handleVerify} className="modern-form">
                  {error && (
                    <motion.div className="form-alert error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                      ⚠️ {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div className="form-alert success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                      ✓ {success}
                    </motion.div>
                  )}

                  <div className="modern-form-group" style={{ alignItems: 'center' }}>
                    <label className="modern-form-label" style={{ marginBottom: 14 }}>One-Time Password</label>
                    <OTPBoxes value={otp} onChange={setOtp} disabled={loading || verified} />
                  </div>

                  <motion.button
                    type="submit"
                    className="modern-btn primary"
                    disabled={loading || verified || otp.length !== 6}
                    whileTap={{ scale: 0.98 }}
                  >
                    {verified ? '✅ Verified!' : loading ? '⏳ Verifying…' : '✓ Verify & Go to Dashboard'}
                  </motion.button>
                </form>

                {/* Resend */}
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  {resendCooldown > 0 ? (
                    <p style={{ color: '#aaa', fontSize: '0.88rem' }}>
                      Resend OTP in <strong style={{ color: '#667eea' }}>{resendCooldown}s</strong>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      🔄 Resend OTP
                    </button>
                  )}
                </div>

                <button onClick={() => setStep('details')} className="btn-back-modern">
                  ← Back to details
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
