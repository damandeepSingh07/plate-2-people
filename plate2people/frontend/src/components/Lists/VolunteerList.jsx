import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../api/axios'
import './VolunteerList.css'

export default function VolunteerList({ ngoId, refreshTrigger }) {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, active, inactive

  useEffect(() => {
    fetchVolunteers()
  }, [ngoId, refreshTrigger])

  const fetchVolunteers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/volunteers/list/?ngo_id=${ngoId}`)
      setVolunteers(response.data || [])
    } catch (error) {
      console.error('Error fetching volunteers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVolunteers = volunteers.filter(v => {
    if (filter === 'active') return v.is_active
    if (filter === 'inactive') return !v.is_active
    return true
  })

  const getRoleIcon = (role) => {
    const icons = {
      delivery: '🚴',
      logistics: '📦',
      coordinator: '📋',
      other: '👤'
    }
    return icons[role] || '👤'
  }

  const getRoleColor = (role) => {
    const colors = {
      delivery: '#667eea',
      logistics: '#764ba2',
      coordinator: '#f97316',
      other: '#6b7280'
    }
    return colors[role] || '#6b7280'
  }

  if (loading) {
    return (
      <div className="volunteer-loading">
        <div className="spinner"></div>
        <p>Loading volunteers...</p>
      </div>
    )
  }

  return (
    <div className="volunteer-list-container">
      <div className="volunteer-header">
        <h3 className="volunteer-title">👥 Your Volunteers</h3>
        <p className="volunteer-count">{filteredVolunteers.length} volunteers</p>
      </div>

      <div className="volunteer-filters">
        {['all', 'active', 'inactive'].map(f => (
          <motion.button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {f === 'all' && '📊 All'}
            {f === 'active' && '✅ Active'}
            {f === 'inactive' && '⏸️ Inactive'}
          </motion.button>
        ))}
      </div>

      {filteredVolunteers.length === 0 ? (
        <motion.div
          className="volunteer-empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-icon">👤</div>
          <h4>No volunteers yet</h4>
          <p>Add volunteers from the "+ Add Volunteer" button to get started</p>
        </motion.div>
      ) : (
        <motion.div
          className="volunteer-cards"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {filteredVolunteers.map((volunteer, idx) => (
            <motion.div
              key={volunteer.id}
              className="volunteer-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
            >
              <div className="volunteer-card-header">
                <div className="volunteer-avatar">
                  {volunteer.name.charAt(0).toUpperCase()}
                </div>
                <div className="volunteer-status">
                  <span className={`status-badge ${volunteer.is_active ? 'active' : 'inactive'}`}>
                    {volunteer.is_active ? '🟢 Active' : '⚪ Inactive'}
                  </span>
                </div>
              </div>

              <div className="volunteer-info">
                <h4 className="volunteer-name">{volunteer.name}</h4>
                
                <div className="volunteer-detail">
                  <span className="detail-icon">📧</span>
                  <a href={`mailto:${volunteer.email}`} className="detail-value">
                    {volunteer.email}
                  </a>
                </div>

                <div className="volunteer-detail">
                  <span className="detail-icon">📱</span>
                  <a href={`tel:${volunteer.phone}`} className="detail-value">
                    {volunteer.phone}
                  </a>
                </div>

                <div className="volunteer-detail">
                  <span className="detail-icon">{getRoleIcon(volunteer.role)}</span>
                  <span
                    className="detail-value role-badge"
                    style={{ color: getRoleColor(volunteer.role), fontWeight: 600 }}
                  >
                    {volunteer.role.charAt(0).toUpperCase() + volunteer.role.slice(1)}
                  </span>
                </div>

                {volunteer.notes && (
                  <div className="volunteer-notes">
                    <p>{volunteer.notes}</p>
                  </div>
                )}

                <div className="volunteer-meta">
                  <span className="meta-item">
                    📍 Joined {new Date(volunteer.created_at).toLocaleDateString()}
                  </span>
                  {volunteer.deliveries_count > 0 && (
                    <span className="meta-item">
                      ✓ {volunteer.deliveries_count} deliveries
                    </span>
                  )}
                </div>
              </div>

              <div className="volunteer-card-actions">
                <motion.button
                  className="action-btn edit"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Edit volunteer"
                >
                  ✏️
                </motion.button>
                <motion.button
                  className="action-btn delete"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Remove volunteer"
                >
                  🗑️
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}