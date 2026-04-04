/**
 * Geocoding utilities using OpenStreetMap Nominatim (free, no API key required).
 */

/**
 * Convert an address string to { lat, lng } coordinates.
 * Returns null if geocoding fails.
 */
export async function geocodeAddress(address) {
  if (!address || address.trim() === '') return null
  try {
    const query = encodeURIComponent(address.trim())
    const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    const res   = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Plate2People/1.0' }
    })
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch (err) {
    console.warn('Geocoding failed:', err)
  }
  // Fallback: try with ", India" appended
  try {
    const query = encodeURIComponent(address.trim() + ', India')
    const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    const res   = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Plate2People/1.0' }
    })
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch (err) {
    console.warn('Fallback geocoding failed:', err)
  }
  // If still no result, return a default location (Delhi, India)
  console.warn('Using default location for address:', address)
  return { lat: 28.6139, lng: 77.2090 } // Delhi coordinates
}

/**
 * Calculate straight-line distance in km between two lat/lng pairs.
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Estimate ETA in minutes given distance (km) and avg speed (km/h).
 */
export function getEtaMinutes(distKm, speedKmh = 20) {
  return Math.round((distKm / speedKmh) * 60)
}

/**
 * Format seconds-since-epoch into a friendly "X mins ago" string.
 */
export function timeAgo(isoString) {
  const diffMs  = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}
