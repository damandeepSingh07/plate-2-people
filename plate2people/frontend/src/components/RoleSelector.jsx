import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './RoleSelector.css'

const roles = [
  {
    key: 'donor',
    emoji: '🍱',
    title: 'Donor',
    subtitle: 'Restaurants, households, events',
    desc: 'Share your surplus food and reduce waste. Your generosity feeds communities.',
    color: 'orange',
    path: '/signup/donor',
  },
  {
    key: 'volunteer',
    emoji: '🚴',
    title: 'Volunteer',
    subtitle: 'Delivery heroes',
    desc: 'Pick up and deliver food to those who need it most. Be the bridge of kindness.',
    color: 'green',
    path: '/signup/volunteer',
  },
  {
    key: 'ngo',
    emoji: '🏢',
    title: 'NGO',
    subtitle: 'Organisations & shelters',
    desc: 'Request food donations for your beneficiaries and manage distributions.',
    color: 'brown',
    path: '/signup/ngo',
  },
]

export default function RoleSelector({ onSelectRole }) {
  const navigate = useNavigate()

  const handleRoleClick = (role) => {
    if (onSelectRole) {
      onSelectRole(role.key)
    } else {
      navigate(role.path)
    }
  }

  return (
    <div className="role-selector">
      {roles.map((r, i) => (
        <motion.button
          key={r.key}
          className={`role-card role-card--${r.color}`}
          style={{ animationDelay: `${i * 0.1}s` }}
          onClick={() => handleRoleClick(r)}
          whileHover={{ scale: 1.05, translateY: -5 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          <span className="role-emoji">{r.emoji}</span>
          <div className="role-info">
            <span className="role-title">{r.title}</span>
            <span className="role-subtitle">{r.subtitle}</span>
            <p className="role-desc">{r.desc}</p>
          </div>
          <span className="role-arrow">→</span>
        </motion.button>
      ))}
    </div>
  )
}
