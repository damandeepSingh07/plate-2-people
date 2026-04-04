import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useCustomHooks'
import { useGamification } from '../hooks/useCustomHooks'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import DonationCard from '../components/Cards/DonationCard'
import DonationDetailsModal from '../components/Modals/DonationDetailsModal'
import Leaderboard from '../components/Gamification/Leaderboard'
import BadgesDisplay from '../components/Gamification/BadgesDisplay'
import NGOVolunteerModal from '../components/Modals/NGOVolunteerModal'
import { motion, AnimatePresence } from 'framer-motion'
import './Dashboard.css'

const ROLE_BADGE_COLORS = {
  food_collector: 'bg-orange-100 text-orange-700',
  delivery:       'bg-blue-100 text-blue-700',
  admin:          'bg-purple-100 text-purple-700',
  general:        'bg-gray-100 text-gray-700',
}

const ROLE_LABELS = {
  food_collector: '🥗 Food Collector',
  delivery:       '🚚 Delivery',
  admin:          '📋 Admin',
  general:        '🤝 General',
}

export default function NGODashboard() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { userPoints, fetchUserPoints } = useGamification()

  const [donations, setDonations]       = useState([])
  const [myAssignments, setMyAssignments] = useState([])
  const [volunteers, setVolunteers]     = useState([])        // registered system volunteers
  const [myTeam, setMyTeam]             = useState([])        // NGO-linked volunteers
  const [loading, setLoading]           = useState(false)
  const [teamLoading, setTeamLoading]   = useState(false)
  const [activeTab, setActiveTab]       = useState('available')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)
  const [selectedDonation, setSelectedDonation]     = useState(null)
  const [showDetailsModal, setShowDetailsModal]     = useState(false)
  const [removingId, setRemovingId]     = useState(null)

  useEffect(() => {
    fetchAvailableDonations()
    fetchMyAssignments()
    fetchAvailableVolunteers()
    fetchMyTeam()
    if (user) fetchUserPoints()
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('donation:created', () => fetchAvailableDonations())
    socket.on('donation:assigned', () => fetchMyAssignments())
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
      const res = await api.get('/donations/available/')
      setDonations(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchMyAssignments = async () => {
    try {
      const res = await api.get('/donations/my-assignments/')
      setMyAssignments(res.data || [])
    } catch (e) { console.error(e) }
  }

  const fetchAvailableVolunteers = async () => {
    try {
      const res = await api.get('/volunteers/')
      setVolunteers(res.data || [])
    } catch (e) { console.error(e) }
  }

  const fetchMyTeam = async () => {
    try {
      setTeamLoading(true)
      const res = await api.get('/volunteers/my-team/')
      setMyTeam(res.data || [])
    } catch (e) { console.error(e) }
    finally { setTeamLoading(false) }
  }

  const handleVolunteerAdded = (newEntry) => {
    setMyTeam(prev => [newEntry, ...prev])
    fetchMyTeam() // refresh from server
  }

  const handleRemoveVolunteer = async (linkId) => {
    if (!confirm('Remove this volunteer from your team?')) return
    setRemovingId(linkId)
    try {
      await api.delete(`/volunteers/${linkId}/remove/`)
      setMyTeam(prev => prev.filter(v => v.id !== linkId))
    } catch (e) {
      console.error('Remove volunteer error:', e)
    } finally {
      setRemovingId(null)
    }
  }
  const viewDonationDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }
  const assignToVolunteer = async (donationId, volunteerId) => {
    try {
      await api.post(`/donations/${donationId}/assign/`, { volunteer_id: volunteerId })
      fetchAvailableDonations()
      fetchMyAssignments()
      setShowVolunteerModal(false)
      setSelectedDonation(null)
    } catch (e) { console.error(e) }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  const deliveredAssignments = myAssignments.filter(a => a.status === 'delivered')
  const activeAssignments = myAssignments.filter(a => a.status !== 'delivered')

  const TABS = [
    { key: 'available',   label: '📦 Available Donations' },
    { key: 'assignments', label: '📋 Active Assignments' },
    { key: 'volunteers',  label: `👥 My Volunteers (${myTeam.length})` },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'badges',      label: '⭐ Badges' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      {/* Hero */}
      <motion.div
        className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white py-12 relative overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <motion.p className="text-rose-100 mb-2" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                Welcome back, {user?.name || user?.organization_name || 'NGO'}! 🏢
              </motion.p>
              <motion.h1 className="text-4xl font-bold mb-2" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                Organization Dashboard
              </motion.h1>
              <motion.p className="text-rose-100" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                Manage donations, volunteers, and community impact
              </motion.p>
            </div>
            <motion.button
              onClick={() => { setActiveTab('volunteers'); setShowAddModal(true) }}
              className="bg-white text-rose-600 px-6 py-3 rounded-full font-bold hover:bg-rose-50 transition shadow-xl"
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
            >
              + Add Volunteer
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="container mx-auto px-4 -mt-6 relative z-10 mb-8">
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={containerVariants} initial="hidden" animate="visible">
          {[
            { label: 'Total Points', value: userPoints || 0, color: 'from-rose-400 to-pink-600', sub: '⭐ Earned' },
            { label: 'Distributed', value: deliveredAssignments.length, color: 'from-emerald-400 to-green-600', sub: '✓ Completed' },
            { label: 'In Progress', value: activeAssignments.length, color: 'from-blue-400 to-blue-600', sub: '🚚 Active' },
            { label: 'My Volunteers', value: myTeam.length, color: 'from-purple-400 to-purple-600', sub: '👥 Team members' },
          ].map(s => (
            <motion.div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-6 shadow-lg text-white`} variants={itemVariants}>
              <p className="text-white/80 text-sm mb-1 font-semibold">{s.label}</p>
              <p className="text-4xl font-bold">{s.value}</p>
              <p className="text-white/70 text-xs mt-2">{s.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Add Volunteer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <NGOVolunteerModal
            onClose={() => setShowAddModal(false)}
            onVolunteerAdded={handleVolunteerAdded}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 font-semibold transition whitespace-nowrap text-sm ${
                activeTab === tab.key
                  ? 'border-b-2 border-rose-600 text-rose-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Available Donations ── */}
        {activeTab === 'available' && (
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              <div className="text-center py-12"><div className="animate-spin inline-block text-2xl">⌛</div><p className="text-gray-500 mt-2">Loading…</p></div>
            ) : donations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-gray-500">No available donations right now. Check back soon!</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                {donations.map(donation => (
                  <motion.div key={donation.id} variants={itemVariants}>
                    <DonationCard
                      donation={donation}
                      onAssign={() => { setSelectedDonation(donation.id); setShowVolunteerModal(true) }}
                      onViewDetails={viewDonationDetails}
                      role="ngo"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Active Assignments ── */}
        {activeTab === 'assignments' && (
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {myAssignments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-gray-500">No assignments yet. Assign available donations to volunteers.</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                {myAssignments.map(a => (
                  <motion.div key={a.id} variants={itemVariants}>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-800 text-sm">{a.food_details || `Donation #${a.donation_id}`}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          a.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          a.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{a.status?.replace('_', ' ')}</span>
                      </div>
                      {a.volunteer_name && (
                        <p className="text-sm text-gray-500">👤 Volunteer: <span className="font-medium text-gray-700">{a.volunteer_name}</span></p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">Assigned: {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── My Volunteers ── */}
        {activeTab === 'volunteers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header row */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">My Volunteer Team</h2>
                <p className="text-gray-500 text-sm mt-1">Manage your linked volunteers and their roles</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl
                           hover:from-rose-600 hover:to-pink-700 transition shadow-lg flex items-center gap-2"
              >
                <span className="text-lg">+</span> Add Volunteer
              </button>
            </div>

            {teamLoading ? (
              <div className="text-center py-12"><div className="animate-spin inline-block text-2xl">⌛</div></div>
            ) : myTeam.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-rose-200">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No volunteers yet</h3>
                <p className="text-gray-500 mb-6">Add volunteers to coordinate food distribution efficiently.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl
                             hover:from-rose-600 hover:to-pink-700 transition shadow-lg"
                >
                  + Add Your First Volunteer
                </button>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                {myTeam.map(member => (
                  <motion.div key={member.id} variants={itemVariants}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition group"
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white text-xl font-bold shadow">
                          {(member.volunteer_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{member.volunteer_name}</p>
                          <p className="text-xs text-gray-500">{member.volunteer_email}</p>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveVolunteer(member.id)}
                        disabled={removingId === member.id}
                        className="opacity-0 group-hover:opacity-100 transition w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 text-sm disabled:opacity-50"
                        title="Remove from team"
                      >
                        {removingId === member.id ? '⏳' : '✕'}
                      </button>
                    </div>

                    {/* Role badge */}
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${ROLE_BADGE_COLORS[member.volunteer_role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[member.volunteer_role] || member.volunteer_role}
                    </span>

                    {/* Phone */}
                    {member.volunteer_phone && (
                      <p className="text-xs text-gray-500 mt-3">📞 {member.volunteer_phone}</p>
                    )}

                    {/* Notes */}
                    {member.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">📝 {member.notes}</p>
                    )}

                    {/* Joined date */}
                    <p className="text-xs text-gray-300 mt-3">
                      Joined: {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Leaderboard ── */}
        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Leaderboard role="ngo" />
          </motion.div>
        )}

        {/* ── Badges ── */}
        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BadgesDisplay />
          </motion.div>
        )}
      </div>

      {/* Volunteer Selection Modal (for assigning donations) */}
      {showVolunteerModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => setShowVolunteerModal(false)}
        >
          <motion.div
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">🚚 Select a Volunteer</h2>
            {volunteers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No volunteers available in the system yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {volunteers.map(v => (
                  <button
                    key={v.id}
                    onClick={() => assignToVolunteer(selectedDonation, v.id)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-rose-500 hover:bg-rose-50 transition text-left"
                  >
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    <p className="text-sm text-gray-500">{v.availability || 'Available'} · {v.vehicle_type || 'Any vehicle'}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowVolunteerModal(false)} className="mt-4 w-full py-2 bg-gray-100 rounded-xl text-gray-700 font-semibold hover:bg-gray-200 transition">
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Donation Details Modal */}
      <DonationDetailsModal 
        donation={selectedDonation}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  )
}
