import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useCustomHooks'
import { useGamification } from '../hooks/useCustomHooks'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import RoleFixAlert from '../components/RoleFixAlert'
import DonationForm from '../components/Forms/DonationForm'
import SecondaryItemsForm from '../components/Forms/SecondaryItemsForm'
import DonationCard from '../components/Cards/DonationCard'
import DonationDetailsModal from '../components/Modals/DonationDetailsModal'
import ChatModal from '../components/Modals/ChatModal'
import Leaderboard from '../components/Gamification/Leaderboard'
import BadgesDisplay from '../components/Gamification/BadgesDisplay'
import { motion, AnimatePresence } from 'framer-motion'
import './Dashboard.css'

const DONATION_TYPES = [
  { key: 'food',   label: '🍱 Food',        desc: 'Cooked meals, groceries, packaged food' },
  { key: 'items',  label: '👕 Clothes & Items', desc: 'Clothes, books, toys, essentials' },
]

export default function DonorDashboard() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { userPoints, fetchUserPoints } = useGamification()

  const [donations, setDonations] = useState([])
  const [donationItems, setDonationItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [donationType, setDonationType] = useState('food')   // 'food' | 'items'
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('donations')    // donations | leaderboard | badges
  const [filter, setFilter] = useState('all')
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [chatDonation, setChatDonation] = useState(null)
  const [showChatModal, setShowChatModal] = useState(false)

  useEffect(() => {
    fetchDonations()
    fetchDonationItems()
    if (user) fetchUserPoints()
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('donation:created', () => { fetchDonations(); fetchDonationItems() })
    socket.on('donation:status_changed', () => fetchDonations())
    socket.on('points:earned', () => fetchUserPoints())
    return () => {
      socket.off('donation:created')
      socket.off('donation:status_changed')
      socket.off('points:earned')
    }
  }, [socket, user])

  const fetchDonations = async () => {
    try {
      setLoading(true)
      const res = await api.get('/donations/my-donations/')
      setDonations(res.data || [])
    } catch (e) { console.error('Error fetching donations:', e) }
    finally { setLoading(false) }
  }

  const fetchDonationItems = async () => {
    try {
      const res = await api.get('/donations/items/')
      setDonationItems(res.data || [])
    } catch (e) { console.error('Error fetching items:', e) }
  }

  const filteredDonations = donations.filter(d => filter === 'all' || d.status === filter)

  const viewDonationDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }

  const openChat = (donation) => {
    setChatDonation(donation)
    setShowChatModal(true)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      <RoleFixAlert />

      {/* Hero Section */}
      <motion.div
        className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-white py-12 relative overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <motion.p className="text-amber-100 mb-2 text-lg font-semibold" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                Welcome back, {user?.first_name || user?.name?.split(' ')[0] || 'Donor'}! 👋
              </motion.p>
              <motion.h1 className="text-5xl font-bold mb-2" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                Donor Dashboard
              </motion.h1>
              <motion.p className="text-amber-100 text-xl" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                Share food or items, change lives, earn rewards 🌟
              </motion.p>
            </div>
            <motion.div className="text-right" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-white text-orange-600 px-8 py-3 rounded-full font-bold hover:bg-amber-50 transition shadow-xl hover:shadow-2xl"
              >
                + Post Donation
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-6 relative z-10 mb-8">
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={containerVariants} initial="hidden" animate="visible">
          {[
            { label: 'Total Points', value: userPoints || 0, color: 'from-amber-400 to-orange-500', sub: '⭐ Earned' },
            { label: 'Food Donations', value: donations.length, color: 'from-blue-400 to-blue-600', sub: `📦 ${donations.reduce((s, d) => s + (d.quantity_number || 0), 0)} units` },
            { label: 'Item Donations', value: donationItems.length, color: 'from-purple-400 to-purple-600', sub: '👕 Non-food items' },
            { label: 'Delivered', value: donations.filter(d => d.status === 'delivered').length, color: 'from-emerald-400 to-green-600', sub: '✓ Successfully shared' },
          ].map(s => (
            <motion.div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-6 shadow-lg text-white`} variants={itemVariants}>
              <p className="text-white/80 text-sm mb-1 font-semibold">{s.label}</p>
              <p className="text-4xl font-bold">{s.value}</p>
              <p className="text-white/70 text-xs mt-2">{s.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">

        {/* Donation Form (accordion) */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="mb-8"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Donation type selector tabs */}
                <div className="flex border-b border-gray-100">
                  {DONATION_TYPES.map(dt => (
                    <button
                      key={dt.key}
                      onClick={() => setDonationType(dt.key)}
                      className={`flex-1 py-4 px-6 text-left transition ${
                        donationType === dt.key
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className={`font-bold text-lg ${donationType === dt.key ? 'text-orange-600' : 'text-gray-600'}`}>
                        {dt.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{dt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Form content */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {donationType === 'food' ? (
                      <motion.div
                        key="food-form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DonationForm
                          onSuccess={() => { setShowForm(false); fetchDonations() }}
                          onClose={() => setShowForm(false)}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="items-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SecondaryItemsForm
                          onSuccess={() => { setShowForm(false); fetchDonationItems() }}
                          onClose={() => setShowForm(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Tabs */}
        <div className="mb-6 flex gap-2 border-b-2 border-gray-300">
          {[
            { key: 'donations',   label: '📦 My Donations' },
            { key: 'leaderboard', label: '🏆 Leaderboard' },
            { key: 'badges',      label: '⭐ Badges' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-6 py-3 font-bold transition text-lg ${
                activeTab === t.key
                  ? 'border-b-4 border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Donations Tab */}
        {activeTab === 'donations' && (
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'assigned', 'delivered'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                    filter === f
                      ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {f === 'all' && '📋 All'}
                  {f === 'pending' && '⏳ Pending'}
                  {f === 'assigned' && '🚚 Assigned'}
                  {f === 'delivered' && '✓ Delivered'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin text-2xl">⌛</div>
                <p className="text-gray-500 mt-2">Loading donations…</p>
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-3xl mb-2">🚫</p>
                <p className="text-gray-500">No {filter !== 'all' ? filter : ''} donations yet</p>
                <button
                  onClick={() => { setShowForm(true); setFilter('all') }}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-lg hover:from-orange-600 hover:to-rose-700 font-bold transition"
                >
                  Post Your First Donation
                </button>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                {filteredDonations.map(donation => (
                  <motion.div key={donation.id} variants={itemVariants}>
                    <DonationCard 
                      donation={donation} 
                      onViewDetails={viewDonationDetails}
                      onChat={() => donation.volunteer ? openChat(donation) : null}
                      role="donor"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Non-food items section */}
            {donationItems.length > 0 && filter === 'all' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>👕</span> My Item Donations
                  <span className="text-sm font-normal text-gray-500">({donationItems.length} items)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {donationItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{item.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.status === 'available' ? 'bg-green-100 text-green-700' :
                          item.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{item.status}</span>
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{item.item_type} · {item.condition} · Qty: {item.quantity}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Leaderboard />
          </motion.div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BadgesDisplay />
          </motion.div>
        )}
      </div>

      {/* Donation Details Modal */}
      <DonationDetailsModal 
        donation={selectedDonation}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => { setShowChatModal(false); setChatDonation(null) }}
        donation={chatDonation}
        recipientId={chatDonation?.volunteer}
        recipientName={chatDonation?.volunteer_name}
      />
    </div>
  )
}
