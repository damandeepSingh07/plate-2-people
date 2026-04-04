import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { GamificationProvider } from './context/GamificationContext'
import { ThemeProvider } from './context/ThemeContext'
import { useState, useEffect } from 'react'

import Home            from './pages/Home'
import SignIn          from './pages/SignIn'
import SignUp          from './pages/SignUp'
import DonorSignup     from './forms/DonorSignup'
import VolunteerSignup from './forms/VolunteerSignup'
import NGOSignup       from './forms/NGOSignup'
import DonorDashboard     from './dashboards/DonorDashboard'
import VolunteerDashboard from './dashboards/VolunteerDashboard'
import NGODashboard       from './dashboards/NGODashboard'
import ChatBot from './components/ChatBot'
import './styles/global.css'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />
  return children
}

function DashboardRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  const map = { donor: '/dashboard/donor', volunteer: '/dashboard/volunteer', ngo: '/dashboard/ngo' }
  return <Navigate to={map[user.role] || '/signin'} replace />
}

function AppContent() {
  const [chatbotOpen, setChatbotOpen] = useState(false)

  return (
    <>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/signin"  element={<SignIn />} />
        <Route path="/signup"  element={<SignUp />} />
        <Route path="/signup/donor"     element={<DonorSignup />} />
        <Route path="/signup/volunteer" element={<VolunteerSignup />} />
        <Route path="/signup/ngo"       element={<NGOSignup />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/donor"
          element={<ProtectedRoute role="donor"><DonorDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/volunteer"
          element={<ProtectedRoute role="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/ngo"
          element={<ProtectedRoute role="ngo"><NGODashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Chatbot - Fixed at bottom right */}
      <div className="chatbot-fab">
        <button 
          className="chatbot-fab-btn"
          onClick={() => setChatbotOpen(!chatbotOpen)}
          title="Chat with Assistant"
        >
          💬
        </button>
      </div>
      <ChatBot isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <GamificationProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </BrowserRouter>
          </GamificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
