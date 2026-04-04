import { useMemo } from 'react'
import { useTrackingPoll } from '../hooks/useLocation'
import { getDistanceKm, getEtaMinutes, timeAgo } from '../utils/geo'
import LiveMap from './LiveMap'
import './TrackingPanel.css'

const STATUS_STEPS = [
  { key: 'available',  label: 'Posted',         icon: '📋' },
  { key: 'requested',  label: 'Requested',       icon: '✉️' },
  { key: 'assigned',   label: 'Volunteer Assigned', icon: '🧑' },
  { key: 'in_transit', label: 'On the Way',      icon: '🚴' },
  { key: 'delivered',  label: 'Delivered',       icon: '✅' },
]

function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus)
  return (
    <div className="status-timeline">
      {STATUS_STEPS.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        return (
          <div key={step.key} className={`timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="timeline-dot">
              <span>{done ? '✓' : step.icon}</span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`timeline-line ${done ? 'done' : ''}`} />
            )}
            <span className="timeline-label">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function VolunteerCard({ location, donation }) {
  const eta = useMemo(() => {
    if (!location || !donation?.pickup_lat) return null
    const dist = getDistanceKm(
      location.latitude,  location.longitude,
      donation.pickup_lat, donation.pickup_lng
    )
    return { dist: dist.toFixed(1), mins: getEtaMinutes(dist) }
  }, [location, donation])

  if (!location) {
    return (
      <div className="volunteer-card volunteer-card--offline">
        <span className="vol-avatar">🚴</span>
        <div className="vol-info">
          <span className="vol-name">Volunteer</span>
          <span className="vol-status">Location not shared yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="volunteer-card">
      <span className="vol-avatar">🚴</span>
      <div className="vol-info">
        <span className="vol-name">{location.volunteer_name}</span>
        <span className="vol-status live">● Live tracking</span>
        <span className="vol-updated">Updated {timeAgo(location.updated_at)}</span>
      </div>
      {eta && (
        <div className="vol-eta">
          <span className="eta-mins">{eta.mins} min</span>
          <span className="eta-dist">{eta.dist} km</span>
        </div>
      )}
    </div>
  )
}

/**
 * Full Zomato/Swiggy-style tracking panel.
 *
 * Props:
 *   donationId  number
 *   onClose     function
 *   userRole    'donor' | 'ngo' | 'volunteer'
 */
export default function TrackingPanel({ donationId, onClose, userRole }) {
  const { tracking, loading } = useTrackingPoll(donationId, 5000)

  const donation = tracking?.donation
  const loc      = tracking?.volunteer_location

  const pickupLatLng    = donation?.pickup_lat    ? [donation.pickup_lat,   donation.pickup_lng]   : null
  const deliveryLatLng  = donation?.delivery_lat  ? [donation.delivery_lat, donation.delivery_lng] : null
  const volunteerLatLng = loc?.latitude           ? [loc.latitude,          loc.longitude]         : null

  const statusLabel = {
    available:  '📋 Posted',
    requested:  '✉️ Requested',
    assigned:   '🧑 Volunteer Assigned',
    in_transit: '🚴 On the Way',
    delivered:  '✅ Delivered',
  }

  return (
    <div className="tracking-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tracking-panel">

        {/* Header */}
        <div className="tracking-header">
          <div>
            <h2 className="tracking-title">Live Tracking</h2>
            {donation && (
              <p className="tracking-subtitle">{donation.food_details?.substring(0, 50)}</p>
            )}
          </div>
          <button className="tracking-close" onClick={onClose}>✕</button>
        </div>

        {loading && !tracking ? (
          <div className="tracking-loading">
            <div className="spinner-ring" />
            <p>Loading tracking data…</p>
          </div>
        ) : !donation ? (
          <div className="tracking-error">
            <span>⚠️</span>
            <p>Tracking data unavailable. Make sure the donation is in-transit.</p>
          </div>
        ) : (
          <>
            {/* Status badge */}
            <div className="tracking-status-badge">
              <span>{statusLabel[donation.status] || donation.status_display}</span>
              <div className="pulse-dot" />
            </div>

            {/* Map */}
            <div className="tracking-map-wrap">
              {pickupLatLng || volunteerLatLng ? (
                <LiveMap
                  pickupLatLng={pickupLatLng}
                  deliveryLatLng={deliveryLatLng}
                  volunteerLatLng={volunteerLatLng}
                  pickupLabel={donation.pickup_location?.substring(0, 40)}
                  deliveryLabel="Delivery Address"
                  volunteerLabel={loc?.volunteer_name || 'Volunteer'}
                  height="340px"
                />
              ) : (
                <div className="map-placeholder">
                  <span>🗺️</span>
                  <p>Map unavailable — coordinates not set for this donation.</p>
                  <small>Donors can add pickup coordinates when posting a donation.</small>
                </div>
              )}
            </div>

            {/* Legend */}
            {(pickupLatLng || volunteerLatLng) && (
              <div className="map-legend">
                <span><span className="legend-dot" style={{ background: '#e8622a' }} />🍱 Pickup</span>
                {deliveryLatLng && <span><span className="legend-dot" style={{ background: '#2d6a4f' }} />🏢 Delivery</span>}
                {volunteerLatLng && <span><span className="legend-dot" style={{ background: '#3d2314', animation: 'legendPulse 1.5s infinite' }} />🚴 Volunteer (live)</span>}
              </div>
            )}

            {/* Volunteer card */}
            <VolunteerCard location={loc} donation={donation} />

            {/* Timeline */}
            <div className="tracking-section-title">Delivery Progress</div>
            <StatusTimeline currentStatus={donation.status} />

            {/* Details grid */}
            <div className="tracking-details">
              <div className="detail-row">
                <span className="detail-label">📍 Pickup</span>
                <span className="detail-value">{donation.pickup_location}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📦 Quantity</span>
                <span className="detail-value">{donation.quantity} · {donation.food_type_display}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">👥 Serves</span>
                <span className="detail-value">~{donation.serves} people</span>
              </div>
              {donation.donor_name && (
                <div className="detail-row">
                  <span className="detail-label">🤝 Donor</span>
                  <span className="detail-value">{donation.donor_name} · {donation.donor_phone}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
