import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropdownOpen(false)
    setMenuOpen(false)
  }

  const roleConfig = {
    donor:     { label: 'Donor',     emoji: '🍱', color: '#f97316', bg: '#fff7ed' },
    volunteer: { label: 'Volunteer', emoji: '🚴', color: '#16a34a', bg: '#f0fdf4' },
    ngo:       { label: 'NGO',       emoji: '🏢', color: '#7c3aed', bg: '#fdf4ff' },
  }
  const role = user ? roleConfig[user.role] : null
  const initials = user ? (user.name || user.first_name || '?')[0].toUpperCase() : '?'

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          {/* Brand */}
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
            <div className="brand-logo-wrap">
              <span className="brand-logo-icon">🍽</span>
            </div>
            <span className="brand-name">
              Plate<span className="brand-accent">2</span>People
            </span>
          </Link>

          {/* Desktop Right */}
          <div className="navbar-right">
            {user ? (
              <div className="user-section" ref={dropdownRef}>
                {role && (
                  <span className="nav-role-badge" style={{ background: role.bg, color: role.color }}>
                    {role.emoji} {role.label}
                  </span>
                )}
                <button
                  className="user-avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="User menu"
                >
                  <span className="user-avatar">{initials}</span>
                  <span className="user-name-short">{user.name?.split(' ')[0] || user.first_name}</span>
                  <span className={`chevron ${dropdownOpen ? 'chevron-up' : ''}`}>▾</span>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <strong>{user.name || user.first_name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      📊 My Dashboard
                    </Link>
                    <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-auth-btns">
                <Link to="/signin" className="btn btn-secondary btn-sm">Sign In</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              className={`hamburger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-brand">
              <span>🍽 Plate<span>2</span>People</span>
            </div>
            {user ? (
              <>
                <div className="drawer-user">
                  <div className="drawer-avatar">{initials}</div>
                  <div>
                    <strong>{user.name || user.first_name}</strong>
                    <p>{role?.emoji} {role?.label}</p>
                  </div>
                </div>
                <Link to="/dashboard" className="drawer-link" onClick={() => setMenuOpen(false)}>
                  📊 Dashboard
                </Link>
                <button className="drawer-link drawer-link-danger" onClick={handleLogout}>
                  🚪 Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="drawer-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link to="/signup" className="drawer-link drawer-link-primary" onClick={() => setMenuOpen(false)}>Get Started →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
