import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Auth.css'

const ROLES = [
  {
    key: 'donor',
    emoji: '🍱',
    title: 'Donor',
    subtitle: 'Restaurants · Households · Events',
    desc: 'Share surplus food and reduce waste.',
    gradient: 'linear-gradient(135deg, #ff9a3c 0%, #e0522a 100%)',
    ring: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    key: 'volunteer',
    emoji: '🚴',
    title: 'Volunteer',
    subtitle: 'Delivery Heroes · Logistics',
    desc: 'Pick up and deliver food where it\'s needed most.',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
    ring: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    key: 'ngo',
    emoji: '🏢',
    title: 'NGO / Shelter',
    subtitle: 'Organisations · Schools · Shelters',
    desc: 'Request food donations for your beneficiaries.',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    ring: '#7c3aed',
    bg: '#fdf4ff',
    border: '#e9d5ff',
  },
]

const BRAND_HEADLINES = {
  role:    { tag: 'Get Started Free', title: 'Join thousands making a difference', sub: 'Choose your role and become part of the community fighting food waste.' },
  details: { tag: 'Almost There!',    title: 'Tell us about yourself', sub: 'We just need a few details to set up your account.' },
  verify:  { tag: 'One Last Step',    title: 'Verify your email address', sub: 'Check your inbox for the 6-digit code to confirm your account.' },
}

/* ── 6-box OTP input ────────────────────────────────────────── */
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
            type="text" inputMode="numeric" maxLength={1}
            value={d}
            onChange={e => handleInput(i, e)}
            onKeyDown={e => handleKey(i, e)}
            disabled={disabled}
            style={{
              width: 50, height: 58,
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              border: `2.5px solid ${d ? 'var(--orange)' : 'var(--gray-200)'}`,
              borderRadius: 12,
              background: d ? 'rgba(249,115,22,0.06)' : 'var(--gray-50)',
              outline: 'none',
              transition: 'all 0.2s',
              color: 'var(--brown)',
              fontFamily: 'var(--font-body)',
              cursor: 'text',
            }}
          />
        )
      })}
    </div>
  )
}

/* ── Step indicator ─────────────────────────────────────────── */
function StepIndicator({ step }) {
  const steps = ['role', 'details', 'verify']
  const idx = steps.indexOf(step)
  return (
    <div className="auth-steps">
      {steps.map((s, i) => (
        <div key={s} className="auth-step">
          <div className={`step-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i < idx ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

/* ── Main SignUp ─────────────────────────────────────────────── */
export default function SignUp() {
  const navigate = useNavigate()
  const { login } = useAuth()
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

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleChange = e => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  const validate = () => {
    if (!form.name.trim())         return [setError('Full name is required'), false][1]
    if (!form.email.includes('@')) return [setError('Please enter a valid email'), false][1]
    if (form.password.length < 6)  return [setError('Password must be at least 6 characters'), false][1]
    if (form.password !== form.confirm_password) return [setError('Passwords do not match'), false][1]
    return true
  }

  const handleSignupAndSendOTP = async e => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/signup/', {
        name: form.name, email: form.email,
        password: form.password, role: selectedRole.key
      })
      if (data.tokens) {
        setPendingTokens(data.tokens)
        localStorage.setItem('access_token', data.tokens.access)
        localStorage.setItem('refresh_token', data.tokens.refresh)
      }
      setPendingUser(data.user)
      setResendCooldown(60)
      setStep('verify')
      setSuccess(`OTP sent to ${form.email}.`)
    } catch (err) {
      const d = err.response?.data
      if (d?.email) setError('Email: ' + (Array.isArray(d.email) ? d.email[0] : d.email))
      else if (d?.error) setError(d.error)
      else setError('Signup failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/send-otp/', { email: form.email })
      setResendCooldown(60); setOtp('')
      setSuccess('New OTP sent!')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend OTP.')
    } finally { setLoading(false) }
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (otp.trim().length !== 6) return setError('Please enter all 6 digits.')
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/verify-otp/', { email: form.email, otp })
      setVerified(true)
      setSuccess('Email verified! Redirecting to your dashboard…')
      login(data.tokens || pendingTokens, data.user || pendingUser)
      setTimeout(() => navigate(`/dashboard/${selectedRole.key}`), 1200)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Try again.')
      setOtp('')
    } finally { setLoading(false) }
  }

  const headline = BRAND_HEADLINES[step]

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
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <span className="brand-tagline">{headline.tag}</span>
                <h2 className="brand-headline">
                  {headline.title.includes('difference')
                    ? <>Join thousands making<br /><em>a difference</em></>
                    : headline.title.includes('yourself')
                    ? <>Tell us<br /><em>about yourself</em></>
                    : <>Verify your<br /><em>email address</em></>
                  }
                </h2>
                <p className="brand-sub">{headline.sub}</p>
              </motion.div>
            </AnimatePresence>

            {/* Role selection preview */}
            {step !== 'role' && selectedRole && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  marginTop: 24,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: selectedRole.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', flexShrink: 0,
                }}>{selectedRole.emoji}</div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Joining as {selectedRole.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 2 }}>{selectedRole.subtitle}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <StepIndicator step={step} />

            <AnimatePresence mode="wait">

              {/* Step 1: Role selection */}
              {step === 'role' && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="auth-form-header">
                    <span className="auth-form-emoji">🚀</span>
                    <h1 className="auth-form-title">Join Plate2People</h1>
                    <p className="auth-form-sub">Choose your role to make a difference</p>
                  </div>

                  <div className="role-select-cards">
                    {ROLES.map((r, i) => (
                      <motion.button
                        key={r.key}
                        onClick={() => { setSelectedRole(r); setStep('details') }}
                        className="role-select-btn"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{
                          background: r.bg,
                          borderColor: r.border,
                        }}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="role-emoji-chip" style={{ background: r.gradient }}>
                          {r.emoji}
                        </div>
                        <div className="role-text">
                          <small>{r.subtitle}</small>
                          <strong>{r.title}</strong>
                          <p>{r.desc}</p>
                        </div>
                        <span className="role-arrow">→</span>
                      </motion.button>
                    ))}
                  </div>

                  <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--gray-500)', fontSize: '0.88rem' }}>
                    Already have an account?{' '}
                    <Link to="/signin" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>
                      Sign in here
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* Step 2: Details form */}
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="auth-form-header">
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '7px 18px', borderRadius: 999,
                      background: selectedRole?.gradient, color: '#fff',
                      fontWeight: 700, fontSize: '0.88rem',
                      marginBottom: 14,
                    }}>
                      {selectedRole?.emoji} {selectedRole?.title}
                    </div>
                    <h1 className="auth-form-title">Tell us about yourself</h1>
                    <p className="auth-form-sub">We'll create your account and send you a verification code</p>
                  </div>

                  <form onSubmit={handleSignupAndSendOTP} className="modern-form">
                    {error && (
                      <motion.div className="form-alert error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                        ⚠️ {error}
                      </motion.div>
                    )}
                    {[
                      { name: 'name',             label: 'Full Name',       type: 'text',     ph: 'John Doe' },
                      { name: 'email',            label: 'Email Address',   type: 'email',    ph: 'you@example.com' },
                      { name: 'password',         label: 'Password',        type: 'password', ph: 'Min 6 characters' },
                      { name: 'confirm_password', label: 'Confirm Password',type: 'password', ph: 'Re-enter password' },
                    ].map(f => (
                      <div key={f.name} className="modern-form-group">
                        <label className="modern-form-label">{f.label}</label>
                        <input
                          type={f.type} name={f.name}
                          className="modern-form-input"
                          placeholder={f.ph}
                          value={form[f.name]}
                          onChange={handleChange} required
                        />
                      </div>
                    ))}
                    <button type="submit" className="modern-btn primary" disabled={loading}>
                      {loading ? '⏳ Creating account…' : '→ Create Account & Send OTP'}
                    </button>
                  </form>

                  <button onClick={() => { setStep('role'); setError('') }} className="btn-back-modern">
                    ← Back to role selection
                  </button>
                </motion.div>
              )}

              {/* Step 3: OTP Verify */}
              {step === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="auth-form-header">
                    <span className="auth-form-emoji" style={{ animation: 'none' }}>📧</span>
                    <h1 className="auth-form-title">Verify Your Email</h1>
                    <p className="auth-form-sub">
                      Enter the 6-digit code sent to{' '}
                      <strong style={{ color: 'var(--orange)' }}>{form.email}</strong>
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 8 }}>
                      💡 In dev mode, check your Django terminal for the OTP
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
                      <label className="modern-form-label" style={{ marginBottom: 14 }}>
                        One-Time Password
                      </label>
                      <OTPBoxes value={otp} onChange={setOtp} disabled={loading || verified} />
                    </div>

                    <button
                      type="submit"
                      className="modern-btn primary"
                      disabled={loading || verified || otp.length !== 6}
                    >
                      {verified ? '✅ Verified!' : loading ? '⏳ Verifying…' : '✓ Verify & Go to Dashboard'}
                    </button>
                  </form>

                  {/* Resend */}
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    {resendCooldown > 0 ? (
                      <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                        Resend OTP in <strong style={{ color: 'var(--orange)' }}>{resendCooldown}s</strong>
                      </p>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={loading}
                        style={{
                          background: 'none', border: 'none',
                          color: 'var(--orange)', fontWeight: 700,
                          cursor: 'pointer', fontSize: '0.88rem'
                        }}
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
          </div>
        </div>

      </div>
    </div>
  )
}
