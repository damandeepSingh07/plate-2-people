import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleLabel = { donor: '🍱 Donor', volunteer: '🚴 Volunteer', ngo: '🏢 NGO' }

  return (
    <nav className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
        <span className="brand-icon">🍽</span>
        <span className="brand-name">Plate<span>2</span>People</span>
      </Link>

      <div className="navbar-right">
        {user ? (
          <>
            <span className="navbar-role">{roleLabel[user.role]}</span>
            <span className="navbar-user">{user.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/signin" className="btn btn-secondary btn-sm">Sign In</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
