import React, { useState, useRef, useEffect } from 'react'
import { api } from '../api/axios'
import { motion, AnimatePresence } from 'framer-motion'
import './ChatBot.css'

export default function ChatBot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: "Hi! 👋 I'm here to help. Ask me anything about Plate2People!",
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await api.post('/chat/chatbot/ask/', {
        message: input
      })

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.message,
        sender: 'bot',
        timestamp: new Date(),
        faq: response.data.matched_faq,
        confidence: response.data.confidence
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div 
      className="chatbot-container"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="chatbot-header">
        <div className="header-content">
          <h3>🤖 Plate2People Assistant</h3>
          <p className="header-subtitle">Always here to help!</p>
        </div>
        <motion.button 
          onClick={onClose} 
          className="close-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ✕
        </motion.button>
      </div>

      <div className="chatbot-messages">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div 
              key={msg.id} 
              className={`message ${msg.sender}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="message-bubble">
                <div className="message-content">
                  {msg.text}
                  {msg.confidence && msg.confidence < 0.6 && (
                    <div className="message-note">
                      ℹ️ Low confidence match - Email us for more help
                    </div>
                  )}
                </div>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div 
              className="message bot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="message-bubble">
                <div className="message-content">
                  <span className="typing-indicator">
                    <span></span><span></span><span></span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chatbot-input-form">
        <motion.input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your question here..."
          disabled={loading}
          className="chatbot-input"
          whileFocus={{ scale: 1.02 }}
        />
        <motion.button 
          type="submit" 
          disabled={loading} 
          className="send-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? '⏳' : '→'}
        </motion.button>
      </form>
    </motion.div>
  )
}
