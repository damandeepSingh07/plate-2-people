/**
 * Chat Modal Component
 * Opens a chat dialog between donor and volunteer for a specific donation.
 * Uses polling to fetch messages in real-time.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function ChatModal({ isOpen, onClose, donation, recipientId, recipientName }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pollRef = useRef(null)

  // Determine the chat partner
  const chatPartnerId = recipientId || (
    user?.role === 'volunteer' ? donation?.donor : donation?.volunteer
  )
  const chatPartnerName = recipientName || (
    user?.role === 'volunteer' ? donation?.donor_name : donation?.volunteer_name
  ) || 'User'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch messages for this conversation
  const fetchMessages = useCallback(async () => {
    if (!chatPartnerId) return
    try {
      const response = await api.get('/chat/messages/conversation/', {
        params: { user_id: chatPartnerId }
      })
      setMessages(response.data || [])
      setError(null)
    } catch (err) {
      // 403 means chat not allowed yet
      if (err.response?.status === 403) {
        setError('Chat is not available yet. The volunteer must accept the donation first.')
      } else {
        console.error('Error fetching messages:', err)
      }
    }
  }, [chatPartnerId])

  // Start/stop polling when modal opens/closes
  useEffect(() => {
    if (isOpen && chatPartnerId) {
      setLoading(true)
      fetchMessages().finally(() => setLoading(false))
      
      // Poll every 3 seconds
      pollRef.current = setInterval(fetchMessages, 3000)
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 300)
    }
    
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isOpen, chatPartnerId, fetchMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !chatPartnerId || sending) return

    setSending(true)
    try {
      await api.post('/chat/messages/', {
        recipient: chatPartnerId,
        message: messageInput.trim()
      })
      setMessageInput('')
      await fetchMessages()
      setError(null)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Cannot send message. Chat permission denied.')
      } else {
        setError('Failed to send message. Please try again.')
      }
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
          style={{ height: '70vh', maxHeight: '600px' }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                {chatPartnerName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="font-bold text-base">{chatPartnerName}</h3>
                <p className="text-xs text-blue-100">
                  {donation?.food_details ? `Re: ${donation.food_details.substring(0, 30)}` : 'Direct message'}
                  {donation?.food_details?.length > 30 ? '…' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition text-lg"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: '#f7f8fc' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin text-2xl mb-2">⏳</div>
                  <p className="text-gray-400 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-6">
                  <div className="text-3xl mb-3">💬</div>
                  <p className="text-gray-500 text-sm">{error}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3">👋</div>
                  <p className="text-gray-500 font-medium">Start the conversation!</p>
                  <p className="text-gray-400 text-sm mt-1">Say hello to {chatPartnerName}</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isMine = msg.sender === user?.id
                  const showTimestamp = index === 0 || 
                    new Date(msg.created_at).toLocaleDateString() !== 
                    new Date(messages[index - 1]?.created_at).toLocaleDateString()

                  return (
                    <React.Fragment key={msg.id}>
                      {showTimestamp && (
                        <div className="text-center">
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {new Date(msg.created_at).toLocaleDateString('en-IN', {
                              weekday: 'short', month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      <motion.div
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className={`max-w-[75%] ${isMine ? 'order-1' : ''}`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMine
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-sm'
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-600'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-xs text-gray-400">
                              {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMine && msg.is_read && (
                              <span className="text-xs text-blue-500">✓✓</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  )
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form 
            onSubmit={handleSend} 
            className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              placeholder={error ? 'Chat unavailable' : 'Type a message...'}
              disabled={sending || !!error}
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <motion.button
              type="submit"
              disabled={sending || !messageInput.trim() || !!error}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
            >
              {sending ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : (
                <span className="text-lg">➤</span>
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
