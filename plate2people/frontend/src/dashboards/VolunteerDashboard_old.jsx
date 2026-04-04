import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import TrackingPanel from '../components/TrackingPanel'
import Navigation from '../components/Navigation'
import MessagingPanel from '../components/MessagingPanel'
import { useLocationSharing } from '../hooks/useLocation'
import './Dashboard.css'
import './VolunteerMap.css'

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const [availablePickups, setAvailablePickups] = useState([])
  const [myDeliveries, setMyDeliveries]         = useState([])
  const [stats, setStats]                       = useState({})
  const [loading, setLoading]                   = useState(true)
  const [actioning, setActioning]               = useState(null)
  const [tab, setTab]                           = useState('available')
  const [toast, setToast]                       = useState('')
  const [trackingId, setTrackingId]             = useState(null)
  const [navigationDonationId, setNavigationDonationId] = useState(null)
  const [showMessaging, setShowMessaging] = useState(false)

  const { sharing, error: geoError, coords, startSharing, stopSharing } = useLocationSharing()

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        api.get('/donations/?status=available'),
        api.get('/volunteer/my-deliveries/'),
        api.get('/stats/'),
      ])
      
      // Handle array of results separately
      if (results[0].status === 'fulfilled') {
        setAvailablePickups(results[0].value.data)
      } else {
        console.error('Failed to fetch available pickups:', results[0].reason)
        showToast('⚠️ Could not load available pickups')
      }
      
      if (results[1].status === 'fulfilled') {
        setMyDeliveries(results[1].value.data)
      } else {
        console.error('Failed to fetch my deliveries:', results[1].reason)
        showToast('⚠️ Could not load your deliveries')
      }
      
      if (results[2].status === 'fulfilled') {
        setStats(results[2].value.data)
      } else {
        console.error('Failed to fetch stats:', results[2].reason)
      }
    } catch (err) {
      console.error('Data loading error:', err)
      showToast('❌ Network error - please check your connection')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpdateStatus = async (donationId, newStatus) => {
    setActioning(donationId)
    try {
      await api.post(`/donations/${donationId}/status/`, { status: newStatus })
      if (newStatus === 'in_transit') {
        showToast('🚴 Pickup accepted! Share your location so donors can track you.')
      } else {
        showToast('✅ Delivery complete! Great work!')
        if (sharing) stopSharing()
      }
      fetchData()
    } catch {
      showToast('❌ Could not update status.')
    } finally {
      setActioning(null)
    }
  }

  const renderDonationCard = (d, showAccept = false) => (
    <div className="item-card" key={d.id}>
      <div className="item-card-header">
        <span className="item-card-title">{d.food_details}</span>
        <span className={`badge badge-${d.status}`}>{d.status_display}</span>
      </div>
      <div className="item-card-meta">
        <span>🍴 {d.food_type_display}</span>
        <span>📦 {d.quantity}</span>
        <span>👥 Feeds ~{d.serves} people</span>
        <span>👤 Donor: {d.donor_name}</span>
        <span>📞 {d.donor_phone}</span>
        <span style={{ width: '100%' }}>📍 Pickup: {d.pickup_location}</span>
        {d.pickup_time && <span>🕐 Pickup by: {new Date(d.pickup_time).toLocaleString()}</span>}
        {d.expiry_time && <span style={{ color: '#c0392b' }}>⏰ Expires: {new Date(d.expiry_time).toLocaleString()}</span>}
        {d.notes && <span style={{ width: '100%' }}>💬 {d.notes}</span>}
      </div>

      <div className="item-card-actions">
        {showAccept && d.status === 'available' && (
          <button className="btn btn-green btn-sm"
            disabled={actioning === d.id}
            onClick={() => handleUpdateStatus(d.id, 'assigned')}>
            {actioning === d.id ? 'Accepting…' : '🚴 Accept Pickup'}
          </button>
        )}

        {d.status === 'assigned' && d.volunteer === user?.id && (
          <button className="btn btn-green btn-sm"
            disabled={actioning === d.id}
            onClick={() => handleUpdateStatus(d.id, 'in_transit')}>
            {actioning === d.id ? 'Starting…' : '🚴 Start Pickup'}
          </button>
        )}

        {(d.status === 'assigned' || d.status === 'in_transit') && d.volunteer === user?.id && (
          <>
            <button
              className={`btn btn-sm location-toggle-btn ${sharing ? 'sharing' : ''}`}
              onClick={() => sharing ? (stopSharing(), showToast('📍 Location sharing stopped.')) : (startSharing(d.id), showToast('📡 Now broadcasting your live location!'))}
            >
              {sharing
                ? <><span className="loc-pulse" />Stop Sharing</>
                : '📡 Share Live Location'}
            </button>

            <button className="btn btn-secondary btn-sm" onClick={() => setTrackingId(d.id)}>
              🗺 Track on Map
            </button>

            {d.status === 'in_transit' && (
              <button className="btn btn-primary btn-sm"
                disabled={actioning === d.id}
                onClick={() => handleUpdateStatus(d.id, 'delivered')}>
                {actioning === d.id ? 'Updating…' : '✅ Mark Delivered'}
              </button>
            )}
          </>
        )}

        {!showAccept && d.status !== 'in_transit' && (
          <button className="btn btn-secondary btn-sm" onClick={() => setTrackingId(d.id)}>
            🗺 View on Map
          </button>
        )}

        {d.status !== 'available' && d.volunteer === user?.id && d.pickup_lat && d.pickup_lng && d.delivery_lat && d.delivery_lng && (
          <button className="btn btn-primary btn-sm" onClick={() => setNavigationDonationId(d.id)}>
            🧭 Get Directions
          </button>
        )}
      </div>

      {sharing && d.volunteer === user?.id && (d.status === 'assigned' || d.status === 'in_transit') && coords && (
        <div className="coords-indicator">
          <span className="coords-dot" />
          Broadcasting live · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </div>
      )}
    </div>
  )

  return (
    <div className="dashboard">
      <Navbar />

      {toast && <div className="toast-notification">{toast}</div>}

      <div className="dashboard-body">
        <div className="container">

          <div className="dashboard-welcome" data-emoji="🚴">
            <span className="welcome-tag">Volunteer Dashboard</span>
            <h1 className="welcome-title">Ready to deliver, {user?.name?.split(' ')[0]}? 🚴</h1>
            <p className="welcome-sub">
              {user?.vehicle_type && `Vehicle: ${user.vehicle_type} · `}
              {user?.availability && `Available: ${user.availability}`}
            </p>
          </div>

          {sharing && (
            <div className="location-status-bar">
              <div className="location-bar-inner">
                <span className="location-live-dot" />
                <span className="location-bar-text">
                  📡 Sharing live location
                  {coords && ` · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
                </span>
                <button className="btn-stop-loc" onClick={() => { stopSharing(); showToast('Location sharing stopped.') }}>Stop</button>
              </div>
            </div>
          )}

          {geoError && <div className="alert alert-error" style={{ marginBottom: 20 }}>{geoError}</div>}

          <div className="stats-row">
            {[
              { icon: '📍', value: stats.available_pickups ?? '—', label: 'Ready for Pickup' },
              { icon: '🚴', value: stats.my_deliveries     ?? '—', label: 'My Deliveries' },
              { icon: '🚚', value: stats.in_transit        ?? '—', label: 'In Transit' },
              { icon: '✅', value: stats.completed         ?? '—', label: 'Completed' },
            ].map((s, i) => (
              <div key={i} style={{ animationDelay: `${i*0.08}s` }}>
                {loading ? (
                  <div className="skeleton-loader skeleton-stat"></div>
                ) : (
                  <div className="stat-box">
                    <span className="stat-box-icon">{s.icon}</span>
                    <span className="stat-box-value">{s.value}</span>
                    <span className="stat-box-label">{s.label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid var(--gray-200)' }}>
            {[
              { key: 'available', label: '📍 Available Pickups' },
              { key: 'mine', label: '🚴 My Deliveries' },
              { key: 'messages', label: '💬 Messages' }
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.92rem', fontWeight: 600,
                color: tab === t.key ? 'var(--orange)' : 'var(--gray-600)',
                borderBottom: tab === t.key ? '3px solid var(--orange)' : '3px solid transparent',
                marginBottom: -2, transition: 'all 0.18s ease',
              }}>{t.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ paddingTop: 20 }}>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                ⏳ Loading your deliveries and available pickups…
              </div>
              {[1,2,3].map(i => <div key={i} className="skeleton-loader" style={{ height: '120px' }}></div>)}
            </div>
          ) : (
            <>
              {tab === 'available' && (
                <div className="db-section">
                  <div className="db-section-header">
                    <h2 className="db-section-title">Available Pickups</h2>
                    <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
                  </div>
                  {availablePickups.length === 0
                    ? <div className="empty-state">
                        <span className="empty-state-icon">🔍</span>
                        <p className="empty-state-title">No pickups available right now</p>
                        <p className="empty-state-desc">Check back soon!</p>
                        <button className="btn btn-secondary" onClick={fetchData}>↻ Check Again</button>
                      </div>
                    : availablePickups.map(d => renderDonationCard(d, true))
                  }
                </div>
              )}

              {tab === 'mine' && (
                <div className="db-section">
                  <h2 className="db-section-title" style={{ marginBottom: 20 }}>My Deliveries</h2>
                  {myDeliveries.length === 0
                    ? <div className="empty-state">
                        <span className="empty-state-icon">📦</span>
                        <p className="empty-state-title">No deliveries yet</p>
                        <p className="empty-state-desc">Accept a pickup to get started.</p>
                      </div>
                    : myDeliveries.map(d => renderDonationCard(d, false))
                  }
                </div>
              )}

              {tab === 'messages' && (
                <div className="db-section" style={{ height: '600px' }}>
                  <MessagingPanel />
                </div>
              )}
            </>
          )}

          <div className="volunteer-tips-card">
            <h3>🌿 Volunteer Guidelines</h3>
            <ul>
              {[
                '✓ Always confirm pickup with the donor before heading out',
                '✓ Enable location sharing once you accept a delivery — donors can track you live',
                '✓ Handle food hygienically — use gloves when possible',
                '✓ Update delivery status promptly so NGOs can plan',
                '✓ Never deliver food past its expiry time',
              ].map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>

        </div>
      </div>

      {trackingId && (
        <TrackingPanel
          donationId={trackingId}
          onClose={() => setTrackingId(null)}
          userRole="volunteer"
        />
      )}

      {navigationDonationId && (() => {
        const donation = myDeliveries.find(d => d.id === navigationDonationId)
        return donation ? (
          <Navigation
            pickupLocation={donation.pickup_location}
            deliveryLocation={donation.delivery_location}
            pickupLat={donation.pickup_lat}
            pickupLng={donation.pickup_lng}
            deliveryLat={donation.delivery_lat}
            deliveryLng={donation.delivery_lng}
            onClose={() => setNavigationDonationId(null)}
          />
        ) : null
      })()}
    </div>
  )
}
