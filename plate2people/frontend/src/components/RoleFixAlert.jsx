import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import '../styles/RoleFixAlert.css'

export default function RoleFixAlert() {
  const { user, fetchUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!user) return null

  // Show alert only if user is not a donor
  const isDonor = user.role === 'donor'
  if (isDonor) return null

  const handleChangeRoleToDonor = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const { data } = await api.put('/user/', { role: 'donor' })
      setMessage('✅ Role updated to Donor! You can now create donations.')
      await fetchUser() // Refresh user context
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update role'
      setError(`❌ Update failed: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="role-alert">
      <div className="role-alert__container">
        <div className="role-alert__header">
          <span className="role-alert__emoji">⚠️</span>
          <h3 className="role-alert__title">403 Error: You're Not a Donor</h3>
        </div>

        <div className="role-alert__body">
          <p className="role-alert__text">
            <strong>Current Role:</strong> <span className="role-badge">{user.role?.toUpperCase()}</span>
          </p>
          <p className="role-alert__explanation">
            Donors create food donations. Your account is currently set as a{' '}
            <strong>{user.role}</strong>, so you can't create donations.
          </p>

          <div className="role-alert__solutions">
            <h4 className="role-alert__subtitle">💡 Quick Fixes:</h4>

            <button
              className="role-alert__btn role-alert__btn--primary"
              onClick={handleChangeRoleToDonor}
              disabled={loading}
            >
              {loading ? '⏳ Updating...' : '✅ Change Role to Donor'}
            </button>

            <p className="role-alert__divider">— OR —</p>

            <p className="role-alert__alt-text">
              <strong>Create a New Donor Account:</strong>
            </p>
            <a href="/signup/donor" className="role-alert__btn role-alert__btn--secondary">
              🆕 Sign Up as Donor
            </a>

            <p className="role-alert__info">
              Then log back in with your new donor account.
            </p>
          </div>

          {message && (
            <div className="role-alert__success">
              {message}
            </div>
          )}

          {error && (
            <div className="role-alert__error">
              {error}
            </div>
          )}
        </div>

        <div className="role-alert__footer">
          <details className="role-alert__details">
            <summary className="role-alert__summary">
              📋 What are the different roles?
            </summary>
            <div className="role-alert__details-content">
              <ul>
                <li>
                  <strong>🍱 Donor:</strong> Creates food donations (restaurants, homes,
                  organizations)
                </li>
                <li>
                  <strong>🛵 Volunteer:</strong> Picks up from donors and delivers to NGOs
                </li>
                <li>
                  <strong>🏢 NGO:</strong> Organization that receives food donations for
                  beneficiaries
                </li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
