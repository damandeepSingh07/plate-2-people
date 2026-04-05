import React, { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../api/axios'

const DonationForm = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    food_details: '',
    food_type: 'cooked',
    quantity: '',
    pickup_location: '',
    expiry_time: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      const newErrors = { ...errors }
      delete newErrors[name]
      setErrors(newErrors)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.food_details.trim()) newErrors.food_details = 'Please describe the food'
    if (!formData.quantity.trim())     newErrors.quantity     = 'Please specify the quantity'
    if (!formData.pickup_location.trim()) newErrors.pickup_location = 'Pickup location is required'
    if (!formData.expiry_time)         newErrors.expiry_time  = 'Expiry time is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      setErrors({})

      const submitData = new FormData()
      submitData.append('food_details',    formData.food_details)
      submitData.append('food_type',       formData.food_type)
      submitData.append('quantity',        formData.quantity)
      submitData.append('pickup_location', formData.pickup_location)
      submitData.append('expiry_time',     formData.expiry_time)

      await api.post('/donations/create/', submitData)

      setSuccess(true)
      setFormData({ food_details: '', food_type: 'cooked', quantity: '', pickup_location: '', expiry_time: '' })

      if (onSuccess) setTimeout(() => onSuccess(), 1500)
    } catch (err) {
      let errorMsg = err.response?.data?.detail || err.message || 'Failed to post donation'
      if (err.response?.status === 403) {
        errorMsg = 'Permission Denied: Only donors can create donations.'
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error
      }
      setErrors((prev) => ({ ...prev, submit: errorMsg }))
    } finally {
      setSubmitting(false)
    }
  }

  const foodTypeOptions = [
    { value: 'cooked',    label: '🍲 Cooked Food' },
    { value: 'raw',       label: '🥬 Raw Ingredients' },
    { value: 'packaged',  label: '📦 Packaged Food' },
    { value: 'bakery',    label: '🥖 Bakery Items' },
    { value: 'beverages', label: '🧃 Beverages' },
    { value: 'other',     label: '🍽️ Other' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">🍱 Post a Food Donation</h2>
        <p className="text-gray-500 text-sm mb-6">Share surplus food with those who need it. Volunteers will pick it up.</p>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3">
            <span className="text-xl">✓</span>
            <div>
              <p className="font-semibold">Donation posted successfully!</p>
              <p className="text-xs text-green-600 mt-0.5">Volunteers can now see and accept your donation</p>
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <span>⚠️</span>
            <span className="text-sm">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Food Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              What are you donating? <span className="text-red-500">*</span>
            </label>
            <textarea
              name="food_details"
              value={formData.food_details}
              onChange={handleInputChange}
              placeholder="e.g., Fresh biryani, chicken curry with rice and vegetables"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none text-sm"
              rows="3"
            />
            {errors.food_details && (
              <p className="text-red-500 text-xs mt-1">⚠️ {errors.food_details}</p>
            )}
          </div>

          {/* Food Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Food Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {foodTypeOptions.map((option) => (
                <label key={option.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="food_type"
                    value={option.value}
                    checked={formData.food_type === option.value}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <div
                    className={`p-2.5 rounded-lg border-2 text-center transition-all text-sm ${
                      formData.food_type === option.value
                        ? 'border-orange-400 bg-orange-50 text-orange-700 font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-orange-200'
                    }`}
                  >
                    {option.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quantity & Expiry Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="e.g., 5 kg, 10 servings"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm"
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">⚠️ {errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Expires At <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="expiry_time"
                value={formData.expiry_time}
                onChange={handleInputChange}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm"
              />
              {errors.expiry_time && (
                <p className="text-red-500 text-xs mt-1">⚠️ {errors.expiry_time}</p>
              )}
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Pickup Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="pickup_location"
              value={formData.pickup_location}
              onChange={handleInputChange}
              placeholder="e.g., ABC Restaurant, 123 Main Street, Downtown"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm"
            />
            {errors.pickup_location && (
              <p className="text-red-500 text-xs mt-1">⚠️ {errors.pickup_location}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Posting...
                </span>
              ) : '✓ Post Donation'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  )
}

export default DonationForm
