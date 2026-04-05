<<<<<<< HEAD
/**
 * DonationForm — Smart Location Edition
 *
 * Pickup:  Auto-detects via navigator.geolocation → Nominatim reverse geocode
 *          Fallback: manual text input with "Use my location" retry
 * Delivery: Search-as-you-type via Nominatim, dropdown of 5 results
 * On submit: opens Google Maps Directions route in new tab (if both coords set)
 * Validation: ensures both coords are within India bounding box
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../api/axios'
import './DonationForm.css'

// ── India bounding box ────────────────────────────────────────────
const INDIA_BOUNDS = { minLat: 6.4, maxLat: 37.6, minLng: 68.1, maxLng: 97.4 }
const inIndia = (lat, lng) =>
  lat >= INDIA_BOUNDS.minLat && lat <= INDIA_BOUNDS.maxLat &&
  lng >= INDIA_BOUNDS.minLng && lng <= INDIA_BOUNDS.maxLng

// ── Nominatim helpers ─────────────────────────────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const NOMINATIM_HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'Plate2People/1.0' }

async function reverseGeocode(lat, lng) {
  const r = await fetch(
    `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: NOMINATIM_HEADERS }
  )
  const d = await r.json()
  return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

async function searchPlaces(query) {
  if (!query || query.length < 3) return []
  const r = await fetch(
    `${NOMINATIM}/search?q=${encodeURIComponent(query + ', India')}&format=jsonv2&limit=5&countrycodes=in`,
    { headers: NOMINATIM_HEADERS }
  )
  const d = await r.json()
  return d.map(p => ({ label: p.display_name, lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
}

// ── Toast component ───────────────────────────────────────────────
function FieldToast({ type, msg }) {
  return (
    <motion.div
      className={`df-field-toast df-field-toast--${type}`}
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
    >
      {type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'} {msg}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────
=======
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../api/axios'

>>>>>>> Daman
const DonationForm = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    food_details: '',
    food_type: 'cooked',
    quantity: '',
    pickup_location: '',
    expiry_time: '',
<<<<<<< HEAD
    notes: '',
    delivery_location: '',
  })

  // Location state
  const [pickupLat, setPickupLat]   = useState(null)
  const [pickupLng, setPickupLng]   = useState(null)
  const [deliveryLat, setDeliveryLat] = useState(null)
  const [deliveryLng, setDeliveryLng] = useState(null)

  const [locStatus, setLocStatus]   = useState('idle') // idle|loading|ok|denied|error
  const [locToast, setLocToast]     = useState(null)   // {type, msg}

  // Delivery autocomplete
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSugg, setShowSugg]       = useState(false)
  const searchTimer = useRef(null)
  const suggRef     = useRef(null)

  const [image, setImage]           = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState({})
  const [success, setSuccess]       = useState(false)
  const fileInputRef = useRef(null)

  // ── Auto-detect pickup on mount ─────────────────────────────────
  useEffect(() => {
    detectLocation()
    // Dismiss suggestions on outside click
    const handler = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('denied')
      setLocToast({ type: 'error', msg: 'Geolocation not supported — enter manually.' })
      return
    }
    setLocStatus('loading')
    setLocToast({ type: 'info', msg: '📍 Detecting your location…' })
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        if (!inIndia(latitude, longitude)) {
          setLocStatus('error')
          setLocToast({ type: 'error', msg: '📍 Location outside India — please enter manually.' })
          return
        }
        try {
          const address = await reverseGeocode(latitude, longitude)
          setPickupLat(latitude)
          setPickupLng(longitude)
          setFormData(prev => ({ ...prev, pickup_location: address }))
          setLocStatus('ok')
          setLocToast({ type: 'success', msg: '📍 Location auto-detected!' })
          setTimeout(() => setLocToast(null), 3500)
        } catch {
          setLocStatus('error')
          setLocToast({ type: 'error', msg: 'Could not get address — enter manually.' })
        }
      },
      (err) => {
        setLocStatus(err.code === 1 ? 'denied' : 'error')
        setLocToast({
          type: 'error',
          msg: err.code === 1
            ? '📍 Location permission denied — please enter manually.'
            : '📍 Location unavailable — enter manually.',
        })
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  // ── Delivery search-as-you-type ─────────────────────────────────
  const handleDeliveryInput = (e) => {
    const val = e.target.value
    setFormData(prev => ({ ...prev, delivery_location: val }))
    setDeliveryLat(null); setDeliveryLng(null)
    clearTimeout(searchTimer.current)
    if (val.length < 3) { setSuggestions([]); setShowSugg(false); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      const results = await searchPlaces(val)
      setSuggestions(results)
      setShowSugg(results.length > 0)
      setSearchLoading(false)
    }, 400)
  }

  const selectSuggestion = (s) => {
    setFormData(prev => ({ ...prev, delivery_location: s.label }))
    setDeliveryLat(s.lat); setDeliveryLng(s.lng)
    setSuggestions([]); setShowSugg(false)
    if (!inIndia(s.lat, s.lng)) {
      setErrors(prev => ({ ...prev, delivery_location: '🇮🇳 Delivery location must be in India.' }))
    } else {
      setErrors(prev => { const e = { ...prev }; delete e.delivery_location; return e })
    }
  }

  // ── Common input handler ────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const e = { ...prev }; delete e[name]; return e })
    // Clear pickup coords if user manually edits location
    if (name === 'pickup_location') { setPickupLat(null); setPickupLng(null); setLocStatus('idle') }
  }

  // ── Image handler ───────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file' })); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' })); return
    }
    setImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
    setErrors(prev => { const e = { ...prev }; delete e.image; return e })
  }

  // ── Validate ────────────────────────────────────────────────────
  const validateForm = () => {
    const errs = {}
    if (!formData.food_details.trim()) errs.food_details = '🍽️ Please describe the food'
    if (!formData.quantity.trim())     errs.quantity     = '📊 Please specify the quantity'
    if (!formData.pickup_location.trim()) errs.pickup_location = '📍 Pickup location is required'
    if (!formData.expiry_time)         errs.expiry_time  = '⏰ Expiry time is required'
    if (pickupLat && !inIndia(pickupLat, pickupLng))
      errs.pickup_location = '🇮🇳 Pickup must be within India'
    if (deliveryLat && !inIndia(deliveryLat, deliveryLng))
      errs.delivery_location = '🇮🇳 Delivery must be within India'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────
=======
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

>>>>>>> Daman
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
<<<<<<< HEAD
      setSubmitting(true); setErrors({})

      const fd = new FormData()
      fd.append('food_details',    formData.food_details)
      fd.append('food_type',       formData.food_type)
      fd.append('quantity',        formData.quantity)
      fd.append('pickup_location', formData.pickup_location)
      fd.append('expiry_time',     formData.expiry_time)
      fd.append('notes',           formData.notes)
      if (pickupLat  != null) fd.append('pickup_lat',   pickupLat)
      if (pickupLng  != null) fd.append('pickup_lng',   pickupLng)
      if (deliveryLat != null) fd.append('delivery_lat', deliveryLat)
      if (deliveryLng != null) fd.append('delivery_lng', deliveryLng)
      if (image) fd.append('food_image', image)

      await api.post('/donations/create/', fd)
      setSuccess(true)

      // Open Google Maps Directions if we have both coords
      if (pickupLat && deliveryLat) {
        const url = `https://www.google.com/maps/dir/?api=1`
          + `&origin=${pickupLat},${pickupLng}`
          + `&destination=${deliveryLat},${deliveryLng}`
          + `&travelmode=driving`
        setTimeout(() => window.open(url, '_blank', 'noopener'), 800)
      }

      // Reset form
      setFormData({ food_details:'', food_type:'cooked', quantity:'', pickup_location:'', expiry_time:'', notes:'', delivery_location:'' })
      setImage(null); setImagePreview(null)
      setPickupLat(null); setPickupLng(null); setDeliveryLat(null); setDeliveryLng(null)
      setLocStatus('idle')

      if (onSuccess) setTimeout(onSuccess, 1800)
    } catch (err) {
      let msg = err.response?.data?.detail || err.message || 'Failed to post donation'
      if (err.response?.status === 403) msg = '❌ Permission Denied: Only donors can create donations.'
      else if (err.response?.data?.error) msg = err.response.data.error
      setErrors(prev => ({ ...prev, submit: msg }))
=======
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
>>>>>>> Daman
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
<<<<<<< HEAD
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
      className="df-container"
    >
      <div className="df-card">
        {/* Header */}
        <div className="df-header">
          <h2 className="df-title">🍽️ Post a Donation</h2>
          <p className="df-subtitle">Share surplus food with those in need. Volunteers will pick it up for free.</p>
        </div>

        {/* Success */}
        <AnimatePresence>
          {success && (
            <motion.div className="df-alert df-alert--success" initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
              <span>✅</span>
              <div>
                <p className="df-alert-title">Donation posted!</p>
                <p className="df-alert-sub">Volunteers can now see and accept your donation.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div className="df-alert df-alert--error" initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
              <span>⚠️</span><span>{errors.submit}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="df-form">

          {/* Food Description */}
          <div className="df-field">
            <label className="df-label">🍽️ What are you donating? *</label>
=======
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
>>>>>>> Daman
            <textarea
              name="food_details"
              value={formData.food_details}
              onChange={handleInputChange}
<<<<<<< HEAD
              placeholder="e.g., Fresh biryani, chicken curry with rice, dal..."
              className={`df-textarea ${errors.food_details ? 'df-input--error' : ''}`}
              rows={3}
            />
            {errors.food_details && <p className="df-error">{errors.food_details}</p>}
          </div>

          {/* Food Type */}
          <div className="df-field">
            <label className="df-label">🏷️ Food Category *</label>
            <div className="df-radio-grid">
              {foodTypeOptions.map(opt => (
                <label key={opt.value} className={`df-radio-card ${formData.food_type === opt.value ? 'df-radio-card--active' : ''}`}>
                  <input type="radio" name="food_type" value={opt.value} checked={formData.food_type === opt.value} onChange={handleInputChange} className="df-radio-hidden" />
                  {opt.label}
=======
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
>>>>>>> Daman
                </label>
              ))}
            </div>
          </div>

<<<<<<< HEAD
          {/* Quantity & Expiry */}
          <div className="df-row">
            <div className="df-field">
              <label className="df-label">📊 Quantity *</label>
              <input type="text" name="quantity" value={formData.quantity} onChange={handleInputChange}
                placeholder="e.g., 5 kg, 10 servings"
                className={`df-input ${errors.quantity ? 'df-input--error' : ''}`} />
              {errors.quantity && <p className="df-error">{errors.quantity}</p>}
            </div>
            <div className="df-field">
              <label className="df-label">⏰ Expires At *</label>
              <input type="datetime-local" name="expiry_time" value={formData.expiry_time} onChange={handleInputChange}
                min={new Date().toISOString().slice(0,16)}
                className={`df-input ${errors.expiry_time ? 'df-input--error' : ''}`} />
              {errors.expiry_time && <p className="df-error">{errors.expiry_time}</p>}
            </div>
          </div>

          {/* ── Pickup Location ── */}
          <div className="df-field">
            <label className="df-label">
              📍 Pickup Location *
              <span className={`df-loc-badge df-loc-badge--${locStatus}`}>
                {locStatus === 'loading' && '⏳ Detecting…'}
                {locStatus === 'ok'      && '✓ Auto-detected'}
                {locStatus === 'denied'  && '⚠ Permission denied'}
                {locStatus === 'error'   && '⚠ Manual mode'}
              </span>
            </label>

            {/* Toast */}
            <AnimatePresence>
              {locToast && <FieldToast type={locToast.type} msg={locToast.msg} />}
            </AnimatePresence>

            <div className="df-loc-row">
              {locStatus === 'loading'
                ? <div className="df-input df-input--skeleton"><span className="df-skeleton-pulse" /></div>
                : (
                  <input
                    type="text"
                    name="pickup_location"
                    value={formData.pickup_location}
                    onChange={handleInputChange}
                    placeholder="e.g., 123 MG Road, Bengaluru, Karnataka"
                    className={`df-input ${errors.pickup_location ? 'df-input--error' : ''}`}
                  />
                )
              }
              {locStatus !== 'loading' && locStatus !== 'ok' && (
                <button type="button" className="df-loc-btn" onClick={detectLocation} title="Detect my location">
                  📍
                </button>
              )}
              {locStatus === 'ok' && (
                <button type="button" className="df-loc-clear-btn" onClick={() => { setLocStatus('idle'); setLocToast(null); setPickupLat(null); setPickupLng(null) }} title="Clear auto-location">✕</button>
              )}
            </div>
            {errors.pickup_location && <p className="df-error">{errors.pickup_location}</p>}
            {pickupLat && (
              <p className="df-coords">🌐 {pickupLat.toFixed(5)}, {pickupLng.toFixed(5)}</p>
            )}
          </div>

          {/* ── Delivery Location ── */}
          <div className="df-field" ref={suggRef}>
            <label className="df-label">
              🚚 Delivery Location
              <span className="df-optional">(optional — opens route map)</span>
            </label>
            <div className="df-autocomplete-wrap">
              <input
                type="text"
                name="delivery_location"
                value={formData.delivery_location}
                onChange={handleDeliveryInput}
                onFocus={() => suggestions.length && setShowSugg(true)}
                placeholder="Search delivery address in India…"
                className={`df-input ${errors.delivery_location ? 'df-input--error' : ''}`}
                autoComplete="off"
              />
              {searchLoading && <span className="df-search-spinner" />}
              {deliveryLat && (
                <button type="button" className="df-loc-clear-btn df-loc-clear-btn--abs" onClick={() => { setDeliveryLat(null); setDeliveryLng(null); setFormData(p=>({...p,delivery_location:''})) }}>✕</button>
              )}
              <AnimatePresence>
                {showSugg && suggestions.length > 0 && (
                  <motion.ul
                    className="df-sugg-list"
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                  >
                    {suggestions.map((s, i) => (
                      <li key={i} className="df-sugg-item" onMouseDown={() => selectSuggestion(s)}>
                        <span className="df-sugg-icon">📌</span>
                        <span className="df-sugg-label">{s.label}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            {errors.delivery_location && <p className="df-error">{errors.delivery_location}</p>}
            {deliveryLat && (
              <p className="df-coords">🌐 {deliveryLat.toFixed(5)}, {deliveryLng.toFixed(5)}</p>
            )}
            {pickupLat && deliveryLat && (
              <p className="df-maps-hint">
                🗺️ Google Maps route will open automatically after submission.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="df-field">
            <label className="df-label">📝 Additional Notes <span className="df-optional">(optional)</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Allergies, temperature requirements, handling instructions…"
              className="df-textarea"
              rows={2}
            />
          </div>

          {/* Image Upload */}
          <div className="df-field">
            <label className="df-label">📸 Food Photo <span className="df-optional">(+3 bonus points)</span></label>
            <div
              className={`df-dropzone ${imagePreview ? 'df-dropzone--has-img' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="df-img-preview-wrap">
                  <img src={imagePreview} alt="Preview" className="df-img-preview" />
                  <button type="button" className="df-img-remove" onClick={e => { e.stopPropagation(); setImage(null); setImagePreview(null) }}>✕ Remove</button>
                </div>
              ) : (
                <>
                  <span className="df-dropzone-icon">📷</span>
                  <p className="df-dropzone-label">Click to upload or drag image here</p>
                  <p className="df-dropzone-sub">PNG, JPG, GIF up to 5MB</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="df-hidden" />
            </div>
            {errors.image && <p className="df-error">{errors.image}</p>}
          </div>

          {/* Submit */}
          <div className="df-actions">
            <motion.button
              type="submit"
              disabled={submitting}
              className="df-btn df-btn--primary"
              whileHover={!submitting ? { scale: 1.02 } : {}}
              whileTap={!submitting ? { scale: 0.98 } : {}}
            >
              {submitting
                ? <><span className="df-spin">⏳</span> Posting…</>
                : '✓ Post Donation'}
            </motion.button>
            {onClose && (
              <button type="button" onClick={onClose} className="df-btn df-btn--cancel">✕ Cancel</button>
            )}
          </div>

=======
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
>>>>>>> Daman
        </form>
      </div>
    </motion.div>
  )
}

export default DonationForm
