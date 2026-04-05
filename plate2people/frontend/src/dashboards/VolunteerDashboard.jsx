import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useCustomHooks'
import { useGamification } from '../hooks/useCustomHooks'
import { useLocationTracking } from '../hooks/useCustomHooks'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import DonationCard from '../components/Cards/DonationCard'
import DonationDetailsModal from '../components/Modals/DonationDetailsModal'
import Leaderboard from '../components/Gamification/Leaderboard'
import BadgesDisplay from '../components/Gamification/BadgesDisplay'
import { motion } from 'framer-motion'
import './Dashboard.css'

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { userPoints, leaderboard, fetchUserPoints } = useGamification()
  const { trackLocation } = useLocationTracking()
  
  const [donations, setDonations] = useState([])
  const [myDeliveries, setMyDeliveries] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('available') // available, active, completed, leaderboard, badges
  const [filter, setFilter] = useState('all')
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Fetch donations on load
  useEffect(() => {
    fetchAvailableDonations()
    fetchMyDeliveries()
    if (user) fetchUserPoints()
  }, [])

  // Track location if enabled
  useEffect(() => {
    if (!trackingEnabled || !user) return
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        trackLocation(position.coords.latitude, position.coords.longitude)
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [trackingEnabled, user])

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return
    
    socket.on('donation:created', () => fetchAvailableDonations())
    socket.on('donation:assigned', () => fetchMyDeliveries())
    socket.on('points:earned', () => fetchUserPoints())
    
    return () => {
      socket.off('donation:created')
      socket.off('donation:assigned')
      socket.off('points:earned')
    }
  }, [socket, user])

  const fetchAvailableDonations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/donations/available/')
      setDonations(response.data || [])
    } catch (error) {
      console.error('Error fetching donations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyDeliveries = async () => {
    try {
      const response = await api.get('/donations/my-deliveries/')
      setMyDeliveries(response.data || [])
    } catch (error) {
      console.error('Error fetching deliveries:', error)
    }
  }

  const acceptDonation = async (donationId) => {
    try {
      setErrorMessage(null)
      await api.post(`/donations/${donationId}/accept/`)
      setSuccessMessage('Donation accepted! You can now start delivery.')
      fetchAvailableDonations()
      fetchMyDeliveries()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error accepting donation'
      setErrorMessage(errorMsg)
      console.error('Error accepting donation:', error)
    }
  }

  const startDelivery = async (donationId) => {
    try {
      setErrorMessage(null)
      await api.post(`/donations/${donationId}/status/`, { status: 'in_transit' })
      setSuccessMessage('Delivery started! Location tracking is active.')
      fetchMyDeliveries()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error starting delivery'
      setErrorMessage(errorMsg)
      console.error('Error starting delivery:', error)
    }
  }

  const markDelivered = async (donationId) => {
    try {
      setErrorMessage(null)
      await api.post(`/donations/${donationId}/delivered/`)
      setSuccessMessage('Delivery marked as completed! You earned 10 points.')
      fetchMyDeliveries()
      fetchAvailableDonations()
      if (user) fetchUserPoints()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error marking delivery as completed'
      setErrorMessage(errorMsg)
      console.error('Error marking delivered:', error)
    }
  }

  const viewDonationDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  const activeDonations = myDeliveries.filter(d => d.status === 'assigned' || d.status === 'in_transit')
  const completedDonations = myDeliveries.filter(d => d.status === 'delivered')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      {/* Hero Section */}
      <motion.div 
        className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white py-12 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start">
            <div>
              <motion.p 
                className="text-blue-100 mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                Welcome back, {user?.first_name || 'Volunteer'}! 🚴
              </motion.p>
              <motion.h1 
                className="text-4xl font-bold mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Volunteer Dashboard
              </motion.h1>
              <motion.p 
                className="text-blue-100"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Every delivery makes a difference
              </motion.p>
            </div>
            <motion.div 
              className="text-right"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => setTrackingEnabled(!trackingEnabled)}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  trackingEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                {trackingEnabled ? '🛑 Stop Tracking' : '📍 Share Location'}
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-6 relative z-10 mb-8">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm border border-blue-100"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-600 mb-1">Total Points</p>
            <p className="text-3xl font-bold text-blue-600">{userPoints || 0}</p>
            <p className="text-xs text-gray-400 mt-2">⭐ Earned</p>
          </motion.div>

          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-600 mb-1">Completed Deliveries</p>
            <p className="text-3xl font-bold text-emerald-600">{completedDonations.length}</p>
            <p className="text-xs text-gray-400 mt-2">+10 points each</p>
          </motion.div>

          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm border border-orange-100"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-600 mb-1">Active Deliveries</p>
            <p className="text-3xl font-bold text-orange-600">{activeDonations.length}</p>
            <p className="text-xs text-gray-400 mt-2">In progress</p>
          </motion.div>

          <motion.div 
            className="bg-white rounded-xl p-6 shadow-sm border border-purple-100"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-600 mb-1">Available</p>
            <p className="text-3xl font-bold text-purple-600">{donations.length}</p>
            <p className="text-xs text-gray-400 mt-2">Ready to pickup</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200 overflow-x-auto">
          {['available', 'active', 'completed', 'leaderboard', 'badges'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'available' && '📦 Available Donations'}
              {tab === 'active' && '🚴 Active Deliveries'}
              {tab === 'completed' && '✅ Completed'}
              {tab === 'leaderboard' && '🏆 Leaderboard'}
              {tab === 'badges' && '⭐ Badges'}
            </button>
          ))}
        </div>

        {/* Available Donations */}
        {activeTab === 'available' && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⌛</div>
                <p className="text-gray-500 mt-2">Loading donations...</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-gray-500">All caught up! No available donations right now.</p>
                <p className="text-sm text-gray-400 mt-2">Check back soon for new opportunities</p>
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {donations.map(donation => (
                  <motion.div key={donation.id} variants={itemVariants}>
                    <DonationCard 
                      donation={donation}
                      onAccept={acceptDonation}
                      onViewDetails={viewDonationDetails}
                      role="volunteer"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Active Deliveries */}
        {activeTab === 'active' && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {activeDonations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">🚴</p>
                <p className="text-gray-500">No active deliveries</p>
                <p className="text-sm text-gray-400 mt-2">Accept a donation to start delivering</p>
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {activeDonations.map(donation => (
                  <motion.div key={donation.id} variants={itemVariants}>
                    <DonationCard 
                      donation={donation}
                      onStartDelivery={startDelivery}
                      onMarkDelivered={markDelivered}
                      onViewDetails={viewDonationDetails}
                      role="volunteer"
                      isActive={true}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Completed Deliveries */}
        {activeTab === 'completed' && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {completedDonations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-gray-500">No completed deliveries yet</p>
                <p className="text-sm text-gray-400 mt-2">Accept a donation and mark it delivered to see it here</p>
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {completedDonations.map(donation => (
                  <motion.div key={donation.id} variants={itemVariants}>
                    <DonationCard 
                      donation={donation}
                      onViewDetails={viewDonationDetails}
                      role="volunteer"
                      isCompleted={true}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Leaderboard role="volunteer" />
          </motion.div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <BadgesDisplay />
          </motion.div>
        )}

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            ✅ {successMessage}
          </motion.div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            ❌ {errorMessage}
          </motion.div>
        )}
      </div>

      {/* Donation Details Modal */}
      <DonationDetailsModal 
        donation={selectedDonation}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

    </div>
  )
}
