import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import api from '../../api/axios'
import './SecondaryItemsForm.css'

const SecondaryItemsForm = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    item_category: 'clothing',
    quantity: '',
    condition: 'good',
    description: '',
    pickup_location: '',
    donation_type: 'free',
    donation_amount: 0,
  })

  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const itemCategories = [
    { value: 'clothing', emoji: '👕', label: 'Clothing' },
    { value: 'books', emoji: '📚', label: 'Books & Stationery' },
    { value: 'furniture', emoji: '🪑', label: 'Furniture' },
    { value: 'electronics', emoji: '💻', label: 'Electronics' },
    { value: 'utensils', emoji: '🍽️', label: 'Kitchen Utensils' },
    { value: 'toys', emoji: '🧸', label: 'Toys & Games' },
    { value: 'bedding', emoji: '🛏️', label: 'Bedding & Blankets' },
    { value: 'medical', emoji: '💊', label: 'Medical Supplies' },
    { value: 'other', emoji: '📦', label: 'Other Items' },
  ]

  const conditions = [
    { value: 'excellent', label: '⭐⭐⭐⭐⭐ Excellent - Like New' },
    { value: 'good', label: '⭐⭐⭐⭐ Good - Minor Wear' },
    { value: 'fair', label: '⭐⭐⭐ Fair - Used But Functional' },
  ]

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

    if (!formData.item_name.trim()) {
      newErrors.item_name = '📦 Please name the item'
    }
    if (!formData.quantity.trim()) {
      newErrors.quantity = '📊 Please specify the quantity'
    }
    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = '📍 Pickup location is required'
    }
    if (!formData.item_category) {
      newErrors.item_category = '🏷️ Please select an item category'
    }
    if (formData.donation_type === 'paid' && formData.donation_amount <= 0) {
      newErrors.donation_amount = '💰 Please enter a valid amount'
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
      submitData.append('item_name', formData.item_name)
      submitData.append('item_category', formData.item_category)
      submitData.append('condition', formData.condition)
      submitData.append('quantity', formData.quantity)
      submitData.append('description', formData.description)
      submitData.append('pickup_location', formData.pickup_location)
      submitData.append('donation_type', formData.donation_type)
      
      if (formData.donation_type === 'paid') {
        submitData.append('funding_amount', formData.donation_amount)
      }

      if (image) {
        submitData.append('item_image', image)
      }

      const response = await api.post('/donations/items/create/', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(true)
      setFormData({
        item_name: '',
        item_category: 'clothing',
        quantity: '',
        condition: 'good',
        description: '',
        pickup_location: '',
        donation_type: 'free',
        donation_amount: 0,
      })
      setImage(null)
      setImagePreview(null)

      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (err) {
      console.error('Error submitting item:', err)
      setErrors((prev) => ({
        ...prev,
        submit: err.response?.data?.detail || err.message || 'Failed to post item',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="secondary-form-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="form-header" variants={itemVariants}>
        <h2 className="form-title">📦 Donate Other Items</h2>
        <p className="form-subtitle">Help others with clothes, books, furniture, and more</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="secondary-form">
        {errors.submit && (
          <motion.div className="form-error-alert" variants={itemVariants}>
            ⚠️ {errors.submit}
          </motion.div>
        )}
        {success && (
          <motion.div className="form-success-alert" variants={itemVariants}>
            ✓ Item posted successfully! It will help someone in need.
          </motion.div>
        )}

        {/* Item Category Selection */}
        <motion.div className="form-section" variants={itemVariants}>
          <label className="section-label">🏷️ What are you donating?</label>
          <div className="category-grid">
            {itemCategories.map((cat) => (
              <motion.label
                key={cat.value}
                className={`category-option ${formData.item_category === cat.value ? 'selected' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="radio"
                  name="item_category"
                  value={cat.value}
                  checked={formData.item_category === cat.value}
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
                <div className="category-icon">{cat.emoji}</div>
                <div className="category-name">{cat.label}</div>
              </motion.label>
            ))}
          </div>
          {errors.item_category && <p className="field-error">{errors.item_category}</p>}
        </motion.div>

        {/* Item Details */}
        <motion.div className="form-row" variants={itemVariants}>
          <div className="form-group">
            <label className="form-label">📝 Item Name</label>
            <input
              type="text"
              name="item_name"
              className="form-input"
              placeholder="e.g., Winter Jackets, Mathematics Textbooks"
              value={formData.item_name}
              onChange={handleInputChange}
              required
            />
            {errors.item_name && <p className="field-error">{errors.item_name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">📊 Quantity</label>
            <input
              type="text"
              name="quantity"
              className="form-input"
              placeholder="e.g., 10 items, 1 set, 5 pairs"
              value={formData.quantity}
              onChange={handleInputChange}
              required
            />
            {errors.quantity && <p className="field-error">{errors.quantity}</p>}
          </div>
        </motion.div>

        {/* Condition Selection */}
        <motion.div className="form-section" variants={itemVariants}>
          <label className="section-label">✨ Item Condition</label>
          <div className="condition-options">
            {conditions.map((cond) => (
              <motion.label
                key={cond.value}
                className={`condition-option ${formData.condition === cond.value ? 'selected' : ''}`}
                whileHover={{ scale: 1.02 }}
              >
                <input
                  type="radio"
                  name="condition"
                  value={cond.value}
                  checked={formData.condition === cond.value}
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
                <span className="condition-label">{cond.label}</span>
              </motion.label>
            ))}
          </div>
        </motion.div>

        {/* Description */}
        <motion.div className="form-group form-group--full" variants={itemVariants}>
          <label className="form-label">📝 Description</label>
          <textarea
            name="description"
            className="form-textarea"
            placeholder="Tell us more about these items. Any special features? Size? Color? Condition details?"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
          />
        </motion.div>

        {/* Location */}
        <motion.div className="form-group form-group--full" variants={itemVariants}>
          <label className="form-label">📍 Pickup Location</label>
          <input
            type="text"
            name="pickup_location"
            className="form-input"
            placeholder="Your address or meeting point"
            value={formData.pickup_location}
            onChange={handleInputChange}
            required
          />
          {errors.pickup_location && <p className="field-error">{errors.pickup_location}</p>}
        </motion.div>

        {/* Image Upload */}
        <motion.div className="form-group form-group--full" variants={itemVariants}>
          <label className="form-label">📸 Item Photo (Optional)</label>
          <div
            className="image-upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const files = e.dataTransfer.files
              if (files[0]) {
                const event = { target: { files } }
                handleImageChange(event)
              }
            }}
          >
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <motion.button
                  type="button"
                  className="remove-image"
                  onClick={(e) => {
                    e.preventDefault()
                    setImage(null)
                    setImagePreview(null)
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✕ Remove Image
                </motion.button>
              </div>
            ) : (
              <>
                <div className="upload-icon">📷</div>
                <p className="upload-text">Click or drag image here</p>
                <p className="upload-hint">JPG, PNG (Max 5MB) • Bonus +3 points! 🎁</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>
          {errors.image && <p className="field-error">{errors.image}</p>}
        </motion.div>

        {/* Donation Type */}
        <motion.div className="form-section" variants={itemVariants}>
          <label className="section-label">💰 Donation Type</label>
          <div className="donation-type-grid">
            <motion.label className="donation-option" whileHover={{ scale: 1.05 }}>
              <input
                type="radio"
                name="donation_type"
                value="free"
                checked={formData.donation_type === 'free'}
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              <div className={`type-box ${formData.donation_type === 'free' ? 'active' : ''}`}>
                <p className="type-emoji">🎁</p>
                <p className="type-title">Free Donation</p>
                <p className="type-desc">Volunteer picks up at no cost</p>
              </div>
            </motion.label>

            <motion.label className="donation-option" whileHover={{ scale: 1.05 }}>
              <input
                type="radio"
                name="donation_type"
                value="paid"
                checked={formData.donation_type === 'paid'}
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              <div className={`type-box ${formData.donation_type === 'paid' ? 'active' : ''}`}>
                <p className="type-emoji">💳</p>
                <p className="type-title">Fund Pickup</p>
                <p className="type-desc">Pay volunteer for pickup service</p>
              </div>
            </motion.label>
          </div>
        </motion.div>

        {/* Funding Amount (Conditional) */}
        {formData.donation_type === 'paid' && (
          <motion.div
            className="form-group form-group--full"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            variants={itemVariants}
          >
            <label className="form-label">💵 Funding Amount (₹)</label>
            <input
              type="number"
              name="donation_amount"
              className="form-input"
              placeholder="Min ₹10, Max ₹10,000"
              min="10"
              max="10000"
              step="10"
              value={formData.donation_amount}
              onChange={handleInputChange}
              required={formData.donation_type === 'paid'}
            />
            <p className="help-text">💡 Your contribution helps pay volunteers for pickup service</p>
            {errors.donation_amount && <p className="field-error">{errors.donation_amount}</p>}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="form-submit-btn"
          disabled={submitting || success}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {submitting ? '⏳ Posting...' : success ? '✓ Posted!' : '✓ Post Item'}
        </motion.button>

        {onClose && (
          <motion.button
            type="button"
            onClick={onClose}
            className="form-cancel-btn"
            variants={itemVariants}
          >
            Cancel
          </motion.button>
        )}
      </form>
    </motion.div>
  )
}

export default SecondaryItemsForm