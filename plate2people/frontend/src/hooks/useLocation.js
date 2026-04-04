import { useEffect, useRef, useCallback, useState } from 'react'
import api from '../api/axios'

/**
 * Hook that manages a volunteer's live GPS broadcast.
 * Call startSharing(donationId) to begin, stopSharing() to end.
 */
export function useLocationSharing() {
  const watchId   = useRef(null)
  const [sharing, setSharing]   = useState(false)
  const [error,   setError]     = useState('')
  const [coords,  setCoords]    = useState(null)

  const stopSharing = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setSharing(false)
    setCoords(null)
    try {
      await api.post('/location/stop/')
    } catch {/* silently ignore */}
  }, [])

  const startSharing = useCallback((donationId = null) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setError('')
    setSharing(true)

    const send = (position) => {
      const { latitude, longitude, heading, speed } = position.coords
      setCoords({ lat: latitude, lng: longitude })
      api.post('/location/update/', {
        latitude,
        longitude,
        heading:     heading  ?? null,
        speed:       speed    ?? null,
        donation_id: donationId,
      }).catch(() => {/* best-effort */})
    }

    watchId.current = navigator.geolocation.watchPosition(send, (err) => {
      setError('Location access denied. Please allow location in your browser settings.')
      setSharing(false)
    }, {
      enableHighAccuracy: true,
      maximumAge:         5000,
      timeout:            10000,
    })
  }, [])

  // Stop on unmount
  useEffect(() => () => { stopSharing() }, [stopSharing])

  return { sharing, error, coords, startSharing, stopSharing }
}

/**
 * Hook that polls a donation's tracking data every N seconds.
 */
export function useTrackingPoll(donationId, intervalMs = 5000) {
  const [tracking, setTracking] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const timerRef = useRef(null)

  const fetchTracking = useCallback(async () => {
    if (!donationId) return
    try {
      const { data } = await api.get(`/tracking/${donationId}/`)
      setTracking(data)
    } catch {/* permission denied or not found */}
  }, [donationId])

  useEffect(() => {
    if (!donationId) return
    setLoading(true)
    fetchTracking().finally(() => setLoading(false))
    timerRef.current = setInterval(fetchTracking, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [donationId, intervalMs, fetchTracking])

  return { tracking, loading, refetch: fetchTracking }
}
