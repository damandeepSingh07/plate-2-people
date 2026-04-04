import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import TrackingPanel from '../components/TrackingPanel'
import { geocodeAddress } from '../utils/geo'
import './Dashboard.css'
import './DonorMap.css'

const FOOD_TYPES = [
  { value: 'cooked',    label: '🍲 Cooked Food' },
  { value: 'raw',       label: '🥕 Raw Ingredients' },
  { value: 'packaged',  label: '📦 Packaged Food' },
  { value: 'beverages', label: '🥤 Beverages' },
  { value: 'bakery',    label: '🥐 Bakery Items' },
  { value: 'other',     label: '🍽 Other' },
]

/* ─── New Donation Modal ──────────────────────────────────────────────────── */
function NewDonationModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    food_details: '', food_type: 'cooked', quantity: '', serves: '',
    pickup_location: '', pickup_time: '', expiry_time: '', notes: '',
    delivery_address: '',
  })
  const [loading,    setLoading]    = useState(false)
  const [geocoding,  setGeocoding]  = useState(false)
  const [error,      setError]      = useState('')
  const [geoStatus,  setGeoStatus]  = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!form.food_details.trim()) {
      setError('🍽️ Please describe the food you\'re donating')
      return
    }
    if (!form.quantity.trim()) {
      setError('📊 Please specify the quantity')
      return
    }
    if (!form.pickup_location.trim()) {
      setError('📍 Pickup address is required')
      return
    }

    setLoading(true)

    let pickupCoords   = null
    let deliveryCoords = null

    // Geocode addresses
    setGeocoding(true)
    setGeoStatus('📍 Geocoding pickup address…')
    if (form.pickup_location) {
      try {
        pickupCoords = await geocodeAddress(form.pickup_location)
        if (!pickupCoords) {
          setError('❌ Could not find pickup location. Please check the address.')
          setGeocoding(false)
          setGeoStatus('')
          setLoading(false)
          return
        }
      } catch (gErr) {
        setError('❌ Error geocoding pickup address: ' + gErr.message)
        setGeocoding(false)
        setGeoStatus('')
        setLoading(false)
        return
      }
    }
    
    if (form.delivery_address) {
      setGeoStatus('📍 Geocoding delivery address…')
      try {
        deliveryCoords = await geocodeAddress(form.delivery_address)
        if (!deliveryCoords) {
          setError('❌ Could not find delivery address. Please check the address.')
          setGeocoding(false)
          setGeoStatus('')
          setLoading(false)
          return
        }
      } catch (gErr) {
        setError('❌ Error geocoding delivery address: ' + gErr.message)
        setGeocoding(false)
        setGeoStatus('')
        setLoading(false)
        return
      }
    }
    setGeocoding(false)
    setGeoStatus('')

    try {
      const payload = {
        food_details:     form.food_details.trim(),
        food_type:        form.food_type,
        quantity:         form.quantity.trim(),
        serves:           form.serves || 1,
        pickup_location:  form.pickup_location.trim(),
        pickup_lat:       pickupCoords?.lat   || null,
        pickup_lng:       pickupCoords?.lng   || null,
        delivery_address: form.delivery_address?.trim() || null,
        delivery_lat:     deliveryCoords?.lat || null,
        delivery_lng:     deliveryCoords?.lng || null,
        pickup_time:      form.pickup_time   || null,
        expiry_time:      form.expiry_time   || null,
        notes:            form.notes.trim(),
      }
      await api.post('/donate/', payload)
      onSuccess()
    } catch (err) {
      console.error('Donation submission error:', err)
      const d = err.response?.data
      const errorMsg = d?.food_details?.[0] || d?.pickup_location?.[0] || d?.quantity?.[0] || d?.detail || 'Failed to post donation. Please check all required fields.'
      setError('❌ ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">🍱 Post a Food Donation</h2>
        {error     && <div className="alert alert-error">{error}</div>}
        {geoStatus && <div className="alert" style={{ background: '#f0f8ff', color: '#0066cc', border: '1px solid #bee3f8' }}>{geoStatus}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Food Description *</label>
            <textarea name="food_details" className="form-input" rows={2} required
              placeholder="e.g. 40 portions of dal-roti, biryani, mixed veg…"
              value={form.food_details} onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Food Type *</label>
              <select name="food_type" className="form-input" value={form.food_type} onChange={handleChange}>
                {FOOD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input name="quantity" className="form-input" placeholder="e.g. 50 meals / 10kg"
                value={form.quantity} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Serves (people)</label>
              <input type="number" name="serves" className="form-input" placeholder="50" min={1}
                value={form.serves} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Time</label>
              <input type="datetime-local" name="expiry_time" className="form-input"
                value={form.expiry_time} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              📍 Pickup Address *
              <span className="geo-badge">Auto-geocoded for map</span>
            </label>
            <textarea name="pickup_location" className="form-input" rows={2} required
              placeholder="Full address — will be plotted on the map for volunteers"
              value={form.pickup_location} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">
              🏢 Default Delivery Address
              <span className="geo-badge">Auto-geocoded for map</span>
            </label>
            <textarea name="delivery_address" className="form-input" rows={2}
              placeholder="NGO / distribution centre address (optional — NGOs can specify their own)"
              value={form.delivery_address} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Pickup Time</label>
            <input type="datetime-local" name="pickup_time" className="form-input"
              value={form.pickup_time} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea name="notes" className="form-input" rows={2}
              placeholder="Allergens, handling instructions, contact notes…"
              value={form.notes} onChange={handleChange} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || geocoding}>
              {geocoding ? '📍 Geocoding…' : loading ? 'Posting…' : 'Post Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Requests Modal ──────────────────────────────────────────────────────── */
function RequestsModal({ donation, onClose, onAction }) {
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState(null)

  useEffect(() => {
    api.get('/requests/').then(({ data }) => {
      setRequests(data.filter(r => r.donation === donation.id))
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load requests:', err)
      setLoading(false)
    })
  }, [donation.id])

  const handleAction = async (reqId, status) => {
    setActioning(reqId)
    try {
      await api.put(`/requests/${reqId}/status/`, { status })
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status } : r))
      onAction()
    } catch (err) {
      console.error('Failed to update request:', err)
      alert('Failed to update request. Please try again.')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">📋 Incoming Requests</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: 20 }}>
          For: <strong>{donation.food_details?.substring(0, 50)}</strong>
        </p>
        {loading
          ? <div className="spinner">Loading requests…</div>
          : requests.length === 0
            ? <div className="empty-state">
                <span className="empty-state-icon">📭</span>
                <p>No requests yet</p>
              </div>
            : requests.map(r => (
              <div key={r.id} className="item-card" style={{ marginBottom: 14 }}>
                <div className="item-card-header">
                  <span className="item-card-title">{r.ngo_name}</span>
                  <span className={`badge badge-${r.status}`}>{r.status_display}</span>
                </div>
                <div className="item-card-meta">
                  <span>📞 {r.ngo_phone}</span>
                  <span>📍 {r.delivery_address?.substring(0, 40)}</span>
                  {r.message && <span style={{ width: '100%' }}>💬 {r.message}</span>}
                </div>
                {r.status === 'pending' && (
                  <div className="item-card-actions">
                    <button className="btn btn-green btn-sm" disabled={actioning === r.id}
                      onClick={() => handleAction(r.id, 'approved')}>✓ Approve</button>
                    <button className="btn btn-sm" style={{ background: '#ffd5d5', color: '#c0392b' }}
                      disabled={actioning === r.id}
                      onClick={() => handleAction(r.id, 'rejected')}>✗ Reject</button>
                  </div>
                )}
              </div>
            ))
        }
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export default function DonorDashboard() {
  const { user } = useAuth()
  const [donations,    setDonations]    = useState([])
  const [stats,        setStats]        = useState({})
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [viewRequests, setViewRequests] = useState(null)
  const [trackingId,   setTrackingId]   = useState(null)
  const [filter,       setFilter]       = useState('all')
  const [toast,        setToast]        = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        api.get('/donations/'),
        api.get('/stats/'),
      ])
      
      if (results[0].status === 'fulfilled') {
        setDonations(results[0].value.data)
      } else {
        console.error('Failed to fetch donations:', results[0].reason)
        showToast('⚠️ Could not load your donations')
      }
      
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value.data)
      } else {
        console.error('Failed to fetch stats:', results[1].reason)
      }
    } catch (err) {
      console.error('Data loading error:', err)
      showToast('❌ Network error - please check your connection')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancelDonation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this donation?')) return
    try {
      await api.post(`/donations/${id}/status/`, { status: 'cancelled' })
      showToast('✅ Donation cancelled')
      fetchData()
    } catch (err) {
      console.error('Failed to cancel donation:', err)
      showToast('❌ Failed to cancel donation')
    }
  }

  const filtered = filter === 'all' ? donations : donations.filter(d => d.status === filter)

  const statusFilters = [
    { key: 'all',       label: 'All' },
    { key: 'available', label: '🟢 Available' },
    { key: 'requested', label: '🟡 Requested' },
    { key: 'assigned',  label: '🔵 Assigned' },
    { key: 'in_transit',label: '🚴 In Transit' },
    { key: 'delivered', label: '✅ Delivered' },
  ]

  const isTrackable = (d) => ['assigned', 'in_transit', 'delivered'].includes(d.status)

  return (
    <div className="dashboard">
      <Navbar />

      {toast && <div className="toast-notification">{toast}</div>}

      <div className="dashboard-body">
        <div className="container">

          {/* Welcome */}
          <div className="dashboard-welcome" data-emoji="🍱">
            <span className="welcome-tag">Donor Dashboard</span>
            <h1 className="welcome-title">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="welcome-sub">
              {user?.organization_name
                ? `Managing donations from ${user.organization_name}`
                : 'Your generosity is changing lives — one plate at a time.'}
            </p>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { icon: '📦', value: stats.total_donations  ?? '—', label: 'Total Donations' },
              { icon: '🟢', value: stats.available        ?? '—', label: 'Available' },
              { icon: '✅', value: stats.delivered        ?? '—', label: 'Delivered' },
              { icon: '📋', value: stats.pending_requests ?? '—', label: 'Pending Requests' },
            ].map((s, i) => (
              <div className="stat-box" key={i} style={{ animationDelay: `${i*0.08}s` }}>
                <span className="stat-box-icon">{s.icon}</span>
                <span className="stat-box-value">{s.value}</span>
                <span className="stat-box-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Map info banner */}
          <div className="map-info-banner">
            <span className="map-info-icon">🗺️</span>
            <div>
              <strong>Live Tracking Available</strong>
              <p>Once a volunteer picks up your donation, you can track their live location in real-time — just like Swiggy or Zomato.</p>
            </div>
          </div>

          {/* Donations section */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">My Donations</h2>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + New Donation
              </button>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {statusFilters.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '6px 16px', borderRadius: 'var(--radius-full)',
                  fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
                  background: filter === f.key ? 'var(--orange)' : 'var(--warm-white)',
                  color:      filter === f.key ? '#fff' : 'var(--brown-mid)',
                  border:     `2px solid ${filter === f.key ? 'var(--orange)' : 'var(--gray-200)'}`,
                  transition: 'all 0.18s ease',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading
              ? <div className="spinner">Loading donations…</div>
              : filtered.length === 0
                ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">🍽</span>
                    <p className="empty-state-title">No donations yet</p>
                    <p className="empty-state-desc">Post your first donation to get started!</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Post Donation</button>
                  </div>
                )
                : filtered.map((d, i) => (
                  <div className="item-card" key={d.id} style={{ animationDelay: `${i*0.07}s` }}>
                    <div className="item-card-header">
                      <span className="item-card-title">{d.food_details}</span>
                      <span className={`badge badge-${d.status}`}>{d.status_display}</span>
                    </div>

                    {/* Live tracking indicator */}
                    {d.status === 'in_transit' && (
                      <div className="live-tracking-badge">
                        <span className="live-dot" />
                        Volunteer is on the way — Live tracking available
                      </div>
                    )}

                    <div className="item-card-meta">
                      <span>🍴 {d.food_type_display}</span>
                      <span>📦 {d.quantity}</span>
                      <span>👥 Serves {d.serves}</span>
                      <span>📍 {d.pickup_location?.substring(0, 40)}</span>
                      {d.pickup_lat && <span style={{ color: 'var(--green)', fontWeight: 600 }}>🗺 Map-enabled</span>}
                      {d.expiry_time && <span>⏰ {new Date(d.expiry_time).toLocaleString()}</span>}
                      <span>📋 {d.request_count} request{d.request_count !== 1 ? 's' : ''}</span>
                    </div>

                    {d.notes && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
                        💬 {d.notes}
                      </p>
                    )}

                    {/* Volunteer info if assigned */}
                    {d.volunteer_name && (
                      <div className="volunteer-assigned-bar">
                        <span>🚴 Volunteer: <strong>{d.volunteer_name}</strong></span>
                        {d.volunteer_location && (
                          <span className="vol-live-tag">
                            <span className="live-dot-small" />Live
                          </span>
                        )}
                      </div>
                    )}

                    <div className="item-card-actions">
                      {d.request_count > 0 && (
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => setViewRequests(d)}>
                          View Requests ({d.request_count})
                        </button>
                      )}
                      {isTrackable(d) && (
                        <button className="btn btn-sm track-btn"
                          onClick={() => setTrackingId(d.id)}>
                          🗺 {d.status === 'in_transit' ? 'Track Live' : 'View on Map'}
                        </button>
                      )}
                      {['available', 'requested'].includes(d.status) && (
                        <button className="btn btn-sm" style={{ background: '#ffd5d5', color: '#c0392b' }}
                          onClick={() => handleCancelDonation(d.id)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {showModal && (
        <NewDonationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchData(); showToast('✅ Donation posted successfully!') }}
        />
      )}

      {viewRequests && (
        <RequestsModal
          donation={viewRequests}
          onClose={() => setViewRequests(null)}
          onAction={fetchData}
        />
      )}

      {trackingId && (
        <TrackingPanel
          donationId={trackingId}
          onClose={() => setTrackingId(null)}
          userRole="donor"
        />
      )}
    </div>
  )
}
