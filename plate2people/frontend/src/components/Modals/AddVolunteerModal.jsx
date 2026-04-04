import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../api/axios'
import './Modal.css'

export default function AddVolunteerModal({ isOpen, onClose, onVolunteerAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'delivery',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roles = [
    { value: 'delivery', label: '🚴 Delivery Partner', icon: '🚴' },
    { value: 'logistics', label: '📦 Logistics Support', icon: '📦' },
    { value: 'coordinator', label: '📋 Coordinator', icon: '📋' },
    { value: 'other', label: '👤 Other', icon: '👤' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return false
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email')
      return false
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Please enter a valid phone number')
      return false
    }
    if (!formData.role) {
      setError('Please select a role')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setLoading(true)
      setError('')
      const response = await api.post('/volunteers/create/', formData)
      setSuccess('Volunteer added successfully! 🎉')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'delivery',
        notes: ''
      })

      // Notify parent
      if (onVolunteerAdded) {
        onVolunteerAdded(response.data)
      }

      // Close modal after success
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 1500)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to add volunteer'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content modern-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header modern-modal-header">
            <div>
              <h2 className="modal-title">➕ Add New Volunteer</h2>
              <p className="modal-subtitle">Invite a volunteer to join your team</p>
            </div>
            <motion.button
              onClick={onClose}
              className="modal-close"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              ✕
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form modern-form">
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
              <label className="modern-form-label">👤 Full Name</label>
              <input
                type="text"
                name="name"
                className="modern-form-input"
                placeholder="Raj Kumar"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
              <label className="modern-form-label">📧 Email Address</label>
              <input
                type="email"
                name="email"
                className="modern-form-input"
                placeholder="raj@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
              <label className="modern-form-label">📱 Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="modern-form-input"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
              <label className="modern-form-label">👔 Role/Position</label>
              <div className="role-options">
                {roles.map((r) => (
                  <label key={r.value} className="role-radio">
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={formData.role === r.value}
                      onChange={handleChange}
                    />
                    <span className="role-radio-label">
                      {r.icon} {r.label}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>

            <motion.div className="modern-form-group" whileHover={{ scale: 1.02 }}>
              <label className="modern-form-label">📝 Additional Notes (Optional)</label>
              <textarea
                name="notes"
                className="modern-form-input modal-textarea"
                placeholder="Any additional details about this volunteer..."
                value={formData.notes}
                onChange={handleChange}
                rows="3"
              />
            </motion.div>

            <div className="modal-actions">
              <motion.button
                type="button"
                onClick={onClose}
                className="modal-btn secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                disabled={loading}
                className="modal-btn primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? '⏳ Adding...' : '✓ Add Volunteer'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}