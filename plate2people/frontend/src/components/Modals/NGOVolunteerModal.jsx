import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../api/axios'

const ROLE_OPTIONS = [
  { value: 'food_collector', label: '🥗 Food Collector', desc: 'Collects food from donors' },
  { value: 'delivery', label: '🚚 Delivery', desc: 'Delivers food to beneficiaries' },
  { value: 'admin', label: '📋 Admin/Coordinator', desc: 'Manages operations' },
  { value: 'general', label: '🤝 General Volunteer', desc: 'Flexible support role' },
]

export default function NGOVolunteerModal({ onClose, onVolunteerAdded }) {
  const [form, setForm] = useState({
    email: '',
    volunteer_role: 'general',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim()) { setError('Email is required.'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/volunteers/add/', form)
      setSuccess(data)
      setTimeout(() => {
        onVolunteerAdded(data)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add volunteer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">➕ Add Volunteer</h2>
            <p className="text-gray-500 text-sm mt-1">Link an existing user to your NGO team</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Success */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <p className="text-green-700 font-semibold">✅ {success.volunteer_name} added to your team!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Volunteer Email *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="volunteer@example.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-500 transition"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              The volunteer must already have an account on Plate2People.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Volunteer Role *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="volunteer_role"
                    value={opt.value}
                    checked={form.volunteer_role === opt.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <div className={`p-3 rounded-xl border-2 transition-all ${
                    form.volunteer_role === opt.value
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-rose-300'
                  }`}>
                    <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any specific tasks or area they cover…"
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-rose-500 transition resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl
                         hover:from-rose-600 hover:to-pink-700 transition disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Adding…
                </span>
              ) : (
                '➕ Add to Team'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
