import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'

/**
 * OTPVerificationStep
 * Shown after signup succeeds. User enters the 6-digit code sent to their email.
 * Props:
 *   email       – the newly-registered email
 *   onVerified(tokens, user) – called on successful verification
 *   onSkip      – called when user wants to continue without verifying (optional)
 */
export default function OTPVerificationStep({ email, onVerified, onSkip }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60) // seconds
  const [resending, setResending] = useState(false)
  const inputRefs = useRef([])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return  // digits only
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)  // single digit
    setOtp(newOtp)
    setError('')

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      inputRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Please enter all 6 digits.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/verify-otp/', { email, otp: code })
      setSuccess(true)
      setTimeout(() => onVerified(data.tokens, data.user), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await api.post('/send-otp/', { email })
      setResendCooldown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend OTP. Try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
          <p className="text-gray-500 text-sm">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-orange-600">{email}</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Check your terminal / spam folder if not received.
          </p>
        </div>

        {/* OTP inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                ${digit ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}
                ${success ? 'border-green-500 bg-green-50' : ''}
                focus:border-orange-500 focus:shadow-md`}
              disabled={loading || success}
            />
          ))}
        </div>

        {/* Success */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-100 text-green-700 rounded-xl text-center font-semibold"
            >
              ✅ Email verified! Redirecting…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-center text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || success || otp.join('').length !== 6}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold rounded-xl
                     hover:from-orange-600 hover:to-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-lg mb-4"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Verifying…
            </span>
          ) : (
            '✓ Verify Email'
          )}
        </button>

        {/* Resend */}
        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-gray-400 text-sm">
              Resend OTP in <span className="font-bold text-orange-600">{resendCooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-orange-600 font-semibold text-sm hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending…' : '🔄 Resend OTP'}
            </button>
          )}
        </div>

        {/* Skip */}
        {onSkip && (
          <div className="text-center mt-4">
            <button
              onClick={onSkip}
              className="text-gray-400 text-xs hover:text-gray-600 underline"
            >
              Skip for now (verify later)
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
