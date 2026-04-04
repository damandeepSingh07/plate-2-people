import React, { useState, useEffect } from 'react'
import './Navigation.css'

export default function Navigation({ 
  pickupLocation, 
  deliveryLocation,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  onClose 
}) {
  const [directions, setDirections] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize Google Maps when component mounts
  useEffect(() => {
    loadGoogleMapsScript()
  }, [])

  // Get directions when locations are available
  useEffect(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      getDirections()
    }
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng])

  const loadGoogleMapsScript = () => {
    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'
    if (window.google) return

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions`
    script.async = true
    script.defer = true
    script.onload = () => {
      setLoading(false)
    }
    script.onerror = () => {
      setError('Failed to load Google Maps. Check your API key.')
      setLoading(false)
    }
    document.head.appendChild(script)
  }

  const getDirections = async () => {
    if (!window.google) {
      setError('Google Maps not loaded')
      return
    }

    const directionsService = new window.google.maps.DirectionsService()

    try {
      const result = await directionsService.route({
        origin: {
          lat: parseFloat(pickupLat),
          lng: parseFloat(pickupLng)
        },
        destination: {
          lat: parseFloat(deliveryLat),
          lng: parseFloat(deliveryLng)
        },
        travelMode: window.google.maps.TravelMode.DRIVING
      })

      setDirections(result)
      setCurrentStep(0)
      setLoading(false)
    } catch (err) {
      setError('Could not get directions: ' + err.message)
      setLoading(false)
    }
  }

  const initMap = () => {
    if (!window.google || !directions) return

    const mapDiv = document.getElementById('navigation-map')
    if (!mapDiv) return

    const map = new window.google.maps.Map(mapDiv, {
      zoom: 12,
      center: {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng)
      }
    })

    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: map,
      directions: directions,
      routeIndex: 0,
      polylineOptions: {
        strokeColor: '#667eea',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    })

    // Add markers
    new window.google.maps.Marker({
      position: {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng)
      },
      map: map,
      title: 'Pickup Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    })

    new window.google.maps.Marker({
      position: {
        lat: parseFloat(deliveryLat),
        lng: parseFloat(deliveryLng)
      },
      map: map,
      title: 'Delivery Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    })
  }

  // Initialize map when directions are loaded
  useEffect(() => {
    if (directions && !loading) {
      setTimeout(initMap, 100)
    }
  }, [directions, loading])

  if (loading) {
    return (
      <div className="navigation-modal-overlay" onClick={onClose}>
        <div className="navigation-modal" onClick={e => e.stopPropagation()}>
          <div className="loading">Loading directions...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="navigation-modal-overlay" onClick={onClose}>
        <div className="navigation-modal" onClick={e => e.stopPropagation()}>
          <div className="error">{error}</div>
          <p className="error-hint">
            Make sure you have set up a Google Maps API key in your .env file:
            <br />
            REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key
          </p>
          <button onClick={onClose} className="close-modal-btn">Close</button>
        </div>
      </div>
    )
  }

  if (!directions) {
    return null
  }

  const route = directions.routes[0]
  const leg = route.legs[0]
  const steps = leg.steps

  return (
    <div className="navigation-modal-overlay" onClick={onClose}>
      <div className="navigation-modal" onClick={e => e.stopPropagation()}>
        <div className="navigation-header">
          <h2>📍 Turn-by-Turn Navigation</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="navigation-content">
          <div className="navigation-map" id="navigation-map"></div>

          <div className="navigation-instructions">
            <div className="trip-summary">
              <div className="summary-item">
                <span className="label">Distance:</span>
                <span className="value">{leg.distance.text}</span>
              </div>
              <div className="summary-item">
                <span className="label">Duration:</span>
                <span className="value">{leg.duration.text}</span>
              </div>
            </div>

            <h3>Directions</h3>
            <div className="instructions-list">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`direction-step ${index === currentStep ? 'active' : ''}`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <div
                      className="step-instruction"
                      dangerouslySetInnerHTML={{ __html: step.instructions }}
                    />
                    <div className="step-distance">{step.distance.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="current-step">
              <h4>Current Direction ({currentStep + 1} of {steps.length})</h4>
              <div className="step-detail">
                <div
                  className="step-text"
                  dangerouslySetInnerHTML={{ __html: steps[currentStep].instructions }}
                />
                <div className="step-info">
                  Distance: {steps[currentStep].distance.text}
                </div>
              </div>
              <div className="step-controls">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="nav-btn"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  disabled={currentStep === steps.length - 1}
                  className="nav-btn"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
