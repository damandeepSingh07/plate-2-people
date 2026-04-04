import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import TrackingPanel from '../components/TrackingPanel'
import './Dashboard.css'
import './NGOMap.css'

/* ─── Request Modal ───────────────────────────────────────────────────────── */
function RequestModal({ donation, onClose, onSuccess }) {
  const [form, setForm] = useState({ delivery_address: '', message: '', required_by: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/request/', {
        donation:         donation.id,
        delivery_address: form.delivery_address,
        message:          form.message,
        required_by:      form.required_by || null,
      })
      onSuccess()
    } catch (err) {
      const d = err.response?.data
      if (d?.non_field_errors) setError(d.non_field_errors[0])
      else setError(d?.detail || 'Failed to send request. You may have already requested this.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">📋 Request This Donation</h2>
        <div className="request-preview-box">
          <strong>{donation.food_details}</strong>
          <div>{donation.quantity} · Serves {donation.serves} · {donation.food_type_display}</div>
          <div>📍 {donation.pickup_location}</div>
          {donation.pickup_lat && <div className="map-enabled-tag">🗺 Map-enabled — live tracking will be available</div>}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Delivery Address *</label>
            <textarea name="delivery_address" className="form-input" rows={2} required
              placeholder="Where should the food be delivered to your NGO?"
              value={form.delivery_address}
              onChange={e => setForm({ ...form, delivery_address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Required By</label>
            <input type="datetime-local" className="form-input"
              value={form.required_by}
              onChange={e => setForm({ ...form, required_by: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Message to Donor</label>
            <textarea name="message" className="form-input" rows={3}
              placeholder="Tell the donor about your beneficiaries and why you need this food…"
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending…' : 'Send Request →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export default function NGODashboard() {
  const { user }  = useAuth()
  const [donations,   setDonations]   = useState([])
  const [myRequests,  setMyRequests]  = useState([])
  const [stats,       setStats]       = useState({})
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('browse')
  const [requesting,  setRequesting]  = useState(null)
  const [trackingId,  setTrackingId]  = useState(null)
  const [toast,       setToast]       = useState('')
  const [searchTerm,  setSearchTerm]  = useState('')
  const [typeFilter,  setTypeFilter]  = useState('all')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [donRes, reqRes, statRes] = await Promise.all([
        api.get('/donations/?status=available'),
        api.get('/requests/'),
        api.get('/stats/'),
      ])
      setDonations(donRes.data)
      setMyRequests(reqRes.data)
      setStats(statRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const requestedIds = new Set(myRequests.map(r => r.donation))

  const filteredDonations = donations.filter(d => {
    const matchSearch = (
      d.food_details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.pickup_location.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const matchType = typeFilter === 'all' || d.food_type === typeFilter
    return matchSearch && matchType
  })

  const foodTypes = ['all', 'cooked', 'raw', 'packaged', 'beverages', 'bakery', 'other']
  const typeEmoji = { all: '🍽', cooked: '🍲', raw: '🥕', packaged: '📦', beverages: '🥤', bakery: '🥐', other: '🍴' }

  // For the "My Requests" tab, get full donation details to track approved ones
  const getTrackableRequests = () =>
    myRequests.filter(r => ['approved', 'fulfilled'].includes(r.status))

  return (
    <div className="dashboard">
      <Navbar />

      {toast && <div className="toast-notification-green">{toast}</div>}

      <div className="dashboard-body">
        <div className="container">

          {/* Welcome */}
          <div className="dashboard-welcome" data-emoji="🏢"
            style={{ background: 'linear-gradient(135deg, var(--green) 0%, #1b4332 100%)' }}>
            <span className="welcome-tag">NGO Dashboard</span>
            <h1 className="welcome-title">Hello, {user?.name?.split(' ')[0]}! 🌿</h1>
            <p className="welcome-sub">
              {user?.beneficiaries_count
                ? `Serving ${user.beneficiaries_count.toLocaleString()} beneficiaries`
                : 'Browse donations, request food, and track live deliveries.'}
            </p>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { icon: '🟢', value: stats.available_donations ?? '—', label: 'Available Now' },
              { icon: '📋', value: stats.total_requests      ?? '—', label: 'My Requests' },
              { icon: '✅', value: stats.approved            ?? '—', label: 'Approved' },
              { icon: '🚚', value: stats.fulfilled           ?? '—', label: 'Fulfilled' },
            ].map((s, i) => (
              <div className="stat-box" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="stat-box-icon">{s.icon}</span>
                <span className="stat-box-value" style={{ color: 'var(--green)' }}>{s.value}</span>
                <span className="stat-box-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Tracking CTA banner */}
          {getTrackableRequests().length > 0 && (
            <div className="ngo-tracking-banner">
              <span>🚴</span>
              <div>
                <strong>Live Delivery Tracking Available!</strong>
                <p>You have {getTrackableRequests().length} approved donation{getTrackableRequests().length > 1 ? 's' : ''} — track the volunteer's live location.</p>
              </div>
              <button className="btn btn-sm track-btn-green" onClick={() => setTab('requests')}>
                Track Now →
              </button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid var(--gray-200)' }}>
            {[
              { key: 'browse',   label: '🟢 Browse Donations' },
              { key: 'requests', label: `📋 My Requests${myRequests.length > 0 ? ` (${myRequests.length})` : ''}` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.92rem', fontWeight: 600,
                color: tab === t.key ? 'var(--green)' : 'var(--gray-600)',
                borderBottom: tab === t.key ? '3px solid var(--green)' : '3px solid transparent',
                marginBottom: -2, transition: 'all 0.18s ease',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Browse Tab ── */}
          {tab === 'browse' && (
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">Available Donations</h2>
                <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="🔍 Search food, donor, location…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {foodTypes.map(ft => (
                    <button key={ft} onClick={() => setTypeFilter(ft)} style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      background: typeFilter === ft ? 'var(--green)' : 'var(--warm-white)',
                      color:      typeFilter === ft ? '#fff' : 'var(--brown-mid)',
                      border:     `2px solid ${typeFilter === ft ? 'var(--green)' : 'var(--gray-200)'}`,
                      transition: 'all 0.18s ease',
                    }}>
                      {typeEmoji[ft]} {ft.charAt(0).toUpperCase() + ft.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {loading
                ? <div className="spinner">Loading donations…</div>
                : filteredDonations.length === 0
                  ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">🍽</span>
                      <p className="empty-state-title">No donations available</p>
                      <p className="empty-state-desc">
                        {searchTerm || typeFilter !== 'all' ? 'Try clearing your filters.' : 'Check back soon!'}
                      </p>
                    </div>
                  )
                  : filteredDonations.map((d, i) => (
                    <div className="item-card" key={d.id} style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="item-card-header">
                        <span className="item-card-title">{d.food_details}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {d.pickup_lat && <span className="map-pin-tag">📍 Map</span>}
                          <span className={`badge badge-${d.status}`}>{d.status_display}</span>
                        </div>
                      </div>
                      <div className="item-card-meta">
                        <span>🍴 {d.food_type_display}</span>
                        <span>📦 {d.quantity}</span>
                        <span>👥 Serves ~{d.serves}</span>
                        <span>👤 {d.donor_name}</span>
                        <span style={{ width: '100%' }}>📍 {d.pickup_location}</span>
                        {d.pickup_time && <span>🕐 Pickup: {new Date(d.pickup_time).toLocaleString()}</span>}
                        {d.expiry_time && (
                          <span style={{ color: '#c0392b' }}>
                            ⏰ Expires: {new Date(d.expiry_time).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {d.notes && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
                          💬 {d.notes}
                        </p>
                      )}
                      <div className="item-card-actions">
                        {requestedIds.has(d.id)
                          ? <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600 }}>
                              ✓ Already Requested
                            </span>
                          : (
                            <button className="btn btn-green btn-sm"
                              onClick={() => setRequesting(d)}>
                              📋 Request This Donation
                            </button>
                          )
                        }
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {/* ── My Requests Tab ── */}
          {tab === 'requests' && (
            <div className="db-section">
              <h2 className="db-section-title" style={{ marginBottom: 20 }}>My Food Requests</h2>
              {loading
                ? <div className="spinner">Loading…</div>
                : myRequests.length === 0
                  ? (
                    <div className="empty-state">
                      <span className="empty-state-icon">📋</span>
                      <p className="empty-state-title">No requests yet</p>
                      <p className="empty-state-desc">Browse available donations and send your first request.</p>
                      <button className="btn btn-green" onClick={() => setTab('browse')}>
                        Browse Donations →
                      </button>
                    </div>
                  )
                  : myRequests.map((r, i) => (
                    <div className="item-card" key={r.id} style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="item-card-header">
                        <span className="item-card-title">
                          {r.donation_details?.food_details || 'Donation'}
                        </span>
                        <span className={`badge badge-${r.status}`}>{r.status_display}</span>
                      </div>

                      {/* Live tracking for approved donations */}
                      {r.status === 'approved' && (
                        <div className="ngo-live-tracking-badge">
                          <span className="live-dot-ngo" />
                          Approved! A volunteer will be assigned — live tracking enabled once in-transit.
                        </div>
                      )}

                      <div className="item-card-meta">
                        {r.donation_details && (
                          <>
                            <span>📦 {r.donation_details.quantity}</span>
                            <span>👥 Serves {r.donation_details.serves}</span>
                            <span>👤 Donor: {r.donation_details.donor_name}</span>
                            {r.donation_details.pickup_lat && (
                              <span style={{ color: 'var(--green)', fontWeight: 600 }}>🗺 Map-enabled</span>
                            )}
                          </>
                        )}
                        <span style={{ width: '100%' }}>📍 Deliver to: {r.delivery_address}</span>
                        {r.required_by && (
                          <span>🕐 Needed by: {new Date(r.required_by).toLocaleString()}</span>
                        )}
                        {r.message && <span style={{ width: '100%' }}>💬 {r.message}</span>}
                        <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                          Requested: {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="item-card-actions">
                        {/* Track button for approved/in-transit donations */}
                        {['approved', 'fulfilled'].includes(r.status) && r.donation_details?.id && (
                          <button className="btn btn-sm track-btn-ngo"
                            onClick={() => setTrackingId(r.donation_details.id)}>
                            🗺 {r.status === 'approved' ? 'Track Delivery' : 'View Map'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

        </div>
      </div>

      {requesting && (
        <RequestModal
          donation={requesting}
          onClose={() => setRequesting(null)}
          onSuccess={() => {
            setRequesting(null)
            showToast('✅ Request sent! Waiting for donor approval.')
            fetchData()
          }}
        />
      )}

      {trackingId && (
        <TrackingPanel
          donationId={trackingId}
          onClose={() => setTrackingId(null)}
          userRole="ngo"
        />
      )}
    </div>
  )
}
