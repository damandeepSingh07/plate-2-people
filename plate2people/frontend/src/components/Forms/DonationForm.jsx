import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import api from '../../api/axios'

const DonationForm = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    food_details: '',
    food_type: 'cooked',
    quantity: '',
    pickup_location: '',
    expiry_time: '',
    notes: '',
  })

  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      const newErrors = { ...errors }
      delete newErrors[name]
      setErrors(newErrors)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size must be less than 5MB' }))
      return
    }

    setImage(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)

    if (errors.image) {
      const newErrors = { ...errors }
      delete newErrors.image
      setErrors(newErrors)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.food_details.trim()) {
      newErrors.food_details = '🍽️ Please describe the food'
    }
    if (!formData.quantity.trim()) {
      newErrors.quantity = '📊 Please specify the quantity'
    }
    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = '📍 Pickup location is required'
    }
    if (!formData.expiry_time) {
      newErrors.expiry_time = '⏰ Expiry time is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      setErrors({})

      const submitData = new FormData()
      submitData.append('food_details', formData.food_details)
      submitData.append('food_type', formData.food_type)
      submitData.append('quantity', formData.quantity)
      submitData.append('pickup_location', formData.pickup_location)
      submitData.append('expiry_time', formData.expiry_time)
      submitData.append('notes', formData.notes)

      if (image) {
        submitData.append('food_image', image)
      }

      const response = await api.post('/donations/create/', submitData)

      setSuccess(true)
      setFormData({
        food_details: '',
        food_type: 'cooked',
        quantity: '',
        pickup_location: '',
        expiry_time: '',
        notes: '',
      })
      setImage(null)
      setImagePreview(null)

      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (err) {
      console.error('Error submitting donation:', err)
      
      // Handle 403 Forbidden (permission denied)
      let errorMsg = err.response?.data?.detail || err.message || 'Failed to post donation'
      if (err.response?.status === 403) {
        errorMsg = '❌ Permission Denied: Only donors can create donations. Check your role in the profile or create a new donor account.'
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error
      }
      
      setErrors((prev) => ({
        ...prev,
        submit: errorMsg,
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const foodTypeOptions = [
    { value: 'cooked', label: '🍲 Cooked Food' },
    { value: 'raw', label: '🥬 Raw Ingredients' },
    { value: 'packaged', label: '📦 Packaged Food' },
    { value: 'bakery', label: '🥖 Bakery Items' },
    { value: 'beverages', label: '🧃 Beverages' },
    { value: 'other', label: '🍽️ Other' },
  ]

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto"
    >
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-2xl shadow-2xl p-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            🍽️ Post a Donation
          </h2>
          <p className="text-emerald-700 dark:text-emerald-300 text-lg">
            Share surplus food with those in need. Volunteers will pick it up for free.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl flex items-center shadow-lg"
          >
            <span className="text-2xl mr-3">✓</span>
            <div>
              <p className="font-semibold">Donation posted successfully!</p>
              <p className="text-sm text-green-50">Volunteers can now see and accept your donation</p>
            </div>
          </motion.div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-xl flex items-center shadow-lg"
          >
            <span className="text-2xl mr-3">⚠️</span>
            <span className="font-semibold">{errors.submit}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Food Description */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              🍽️ What are you donating? *
            </label>
            <textarea
              name="food_details"
              value={formData.food_details}
              onChange={handleInputChange}
              placeholder="e.g., Fresh biryani, chicken curry with rice, dal, and fresh vegetables"
              className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white resize-none"
              rows="3"
            />
            {errors.food_details && (
              <p className="text-red-500 text-sm mt-1">⚠️ {errors.food_details}</p>
            )}
          </motion.div>

          {/* Food Type */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-3">
              🏷️ Food Category *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.food_type === option.value
                        ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-bold text-sm">{option.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Quantity & Expiry Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                📊 Quantity *
              </label>
              <input
                type="text"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="e.g., 5 kg, 10 servings"
                className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">⚠️ {errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                ⏰ Expires At *
              </label>
              <input
                type="datetime-local"
                name="expiry_time"
                value={formData.expiry_time}
                onChange={handleInputChange}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              {errors.expiry_time && (
                <p className="text-red-500 text-sm mt-1">⚠️ {errors.expiry_time}</p>
              )}
            </div>
          </motion.div>

          {/* Pickup Location */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              📍 Pickup Location *
            </label>
            <input
              type="text"
              name="pickup_location"
              value={formData.pickup_location}
              onChange={handleInputChange}
              placeholder="e.g., ABC Restaurant, 123 Main Street, Downtown"
              className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            />
            {errors.pickup_location && (
              <p className="text-red-500 text-sm mt-1">⚠️ {errors.pickup_location}</p>
            )}
          </motion.div>

          {/* Additional Notes */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              📝 Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="e.g., Allergies, handling instructions, temperature requirements..."
              className="w-full px-4 py-3 border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:outline-none focus:border-emerald-500 dark:bg-gray-700 dark:text-white resize-none"
              rows="2"
            />
          </motion.div>

          {/* Image Upload */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              📸 Food Photo (+3 bonus points)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-400 dark:border-emerald-600 rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
            >
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-40 mx-auto rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImage(null)
                      setImagePreview(null)
                    }}
                    className="text-sm text-red-500 hover:text-red-700 font-semibold"
                  >
                    ✕ Remove Image
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-3xl mb-2">📷</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Click to upload or drag image here
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">⚠️ {errors.image}</p>
            )}
          </motion.div>

          {/* Submit Buttons */}
          <motion.div variants={itemVariants} className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Posting...
                </span>
              ) : (
                <span>✓ Post Donation</span>
              )}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                ✕ Cancel
              </button>
            )}
          </motion.div>
        </form>
      </div>
    </motion.div>
  )
}

export default DonationForm
