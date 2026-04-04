import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Fix Leaflet's broken default icon path with Vite ───────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Custom SVG icon factory ─────────────────────────────────────────────────
function svgIcon(svg, size = [40, 40], anchor = [20, 40]) {
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  })
}

const pickupIcon = svgIcon(`
  <div style="
    width:42px;height:42px;
    background:#e8622a;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 4px 12px rgba(232,98,42,0.5);
    display:flex;align-items:center;justify-content:center;
  ">
    <span style="transform:rotate(45deg);font-size:18px;">🍱</span>
  </div>`, [42, 42], [21, 42])

const deliveryIcon = svgIcon(`
  <div style="
    width:42px;height:42px;
    background:#2d6a4f;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 4px 12px rgba(45,106,79,0.5);
    display:flex;align-items:center;justify-content:center;
  ">
    <span style="transform:rotate(45deg);font-size:18px;">🏢</span>
  </div>`, [42, 42], [21, 42])

const volunteerIcon = svgIcon(`
  <div style="position:relative;">
    <div style="
      width:48px;height:48px;
      background:#3d2314;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 4px 16px rgba(61,35,20,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      position:relative;z-index:2;
    ">🚴</div>
    <div style="
      position:absolute;top:0;left:0;
      width:48px;height:48px;
      border-radius:50%;
      background:rgba(61,35,20,0.2);
      animation:pulse 1.6s ease-out infinite;
      z-index:1;
    "></div>
    <style>
      @keyframes pulse {
        0%   { transform:scale(1);  opacity:0.7; }
        100% { transform:scale(2.2);opacity:0; }
      }
    </style>
  </div>`, [48, 48], [24, 24])

// ── Auto-fit bounds when markers change ────────────────────────────────────
function AutoFitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [map, positions])
  return null
}

// ── Smooth pan to volunteer position ──────────────────────────────────────
function SmoothPan({ position }) {
  const map  = useMap()
  const prev = useRef(null)
  useEffect(() => {
    if (!position) return
    if (prev.current &&
        (Math.abs(prev.current[0] - position[0]) > 0.00001 ||
         Math.abs(prev.current[1] - position[1]) > 0.00001)) {
      // Don't re-center aggressively; only animate if significantly moved
    }
    prev.current = position
  }, [map, position])
  return null
}

/**
 * LiveMap component.
 *
 * Props:
 *   pickupLatLng    [lat, lng]  – required
 *   deliveryLatLng  [lat, lng]  – optional
 *   volunteerLatLng [lat, lng]  – optional (live)
 *   pickupLabel     string
 *   deliveryLabel   string
 *   volunteerLabel  string
 *   height          string (CSS, default '420px')
 */
export default function LiveMap({
  pickupLatLng,
  deliveryLatLng,
  volunteerLatLng,
  pickupLabel    = 'Pickup Point',
  deliveryLabel  = 'Delivery Point',
  volunteerLabel = 'Volunteer',
  height         = '420px',
}) {
  // Collect all valid positions for bounds fitting
  const positions = [
    pickupLatLng,
    deliveryLatLng,
    volunteerLatLng,
  ].filter(Boolean)

  const center = pickupLatLng || volunteerLatLng || [20.5937, 78.9629] // India default

  // Build polyline segments
  const polylinePoints = []
  if (volunteerLatLng && pickupLatLng)  polylinePoints.push([volunteerLatLng, pickupLatLng])
  if (pickupLatLng && deliveryLatLng)   polylinePoints.push([pickupLatLng, deliveryLatLng])

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.14)', height }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/"></a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positions.length > 1 && <AutoFitBounds positions={positions} />}
        {volunteerLatLng       && <SmoothPan position={volunteerLatLng} />}

        {/* Route polylines */}
        {volunteerLatLng && pickupLatLng && (
          <Polyline
            positions={[volunteerLatLng, pickupLatLng]}
            pathOptions={{ color: '#e8622a', weight: 4, dashArray: '8 8', opacity: 0.85 }}
          />
        )}
        {pickupLatLng && deliveryLatLng && (
          <Polyline
            positions={[pickupLatLng, deliveryLatLng]}
            pathOptions={{ color: '#2d6a4f', weight: 4, opacity: 0.75 }}
          />
        )}

        {/* Pickup marker */}
        {pickupLatLng && (
          <Marker position={pickupLatLng} icon={pickupIcon}>
            <Popup>
              <strong>🍱 {pickupLabel}</strong><br />
              <small>Pickup Location</small>
            </Popup>
          </Marker>
        )}

        {/* Delivery marker */}
        {deliveryLatLng && (
          <Marker position={deliveryLatLng} icon={deliveryIcon}>
            <Popup>
              <strong>🏢 {deliveryLabel}</strong><br />
              <small>Delivery Destination</small>
            </Popup>
          </Marker>
        )}

        {/* Live volunteer marker */}
        {volunteerLatLng && (
          <Marker position={volunteerLatLng} icon={volunteerIcon}>
            <Popup>
              <strong>🚴 {volunteerLabel}</strong><br />
              <small>Live Location</small>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
