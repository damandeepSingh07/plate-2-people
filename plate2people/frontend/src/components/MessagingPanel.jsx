import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './MessagingPanel.css'

export default function MessagingPanel() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversations
  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchConversations()
      if (selectedConversation) {
        fetchMessages(selectedConversation)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/messages/conversations_list/')
      setConversations(response.data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchMessages = async (userId) => {
    try {
      const response = await api.get('/chat/messages/conversation/', {
        params: { user_id: userId }
      })
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/chat/messages/available_users/')
      setAvailableUsers(response.data)
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chat/messages/unread_count/')
      setUnreadCount(response.data.unread_count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedConversation) return

    setLoading(true)
    try {
      await api.post('/chat/messages/', {
        recipient: selectedConversation,
        message: messageInput
      })
      setMessageInput('')
      fetchMessages(selectedConversation)
      fetchConversations()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = async (userId) => {
    setSelectedConversation(userId)
    setShowNewChat(false)
    fetchMessages(userId)
    fetchConversations()
  }

  const handleOpenNewChat = async () => {
    setShowNewChat(true)
    await fetchAvailableUsers()
  }

  const getOtherUserName = (conversation) => {
    const otherUser = conversation.user1.id === user.id 
      ? conversation.user2
      : conversation.user1
    return otherUser.name
  }

  const getOtherUserId = (conversation) => {
    const otherUser = conversation.user1.id === user.id 
      ? conversation.user2
      : conversation.user1
    return otherUser.id
  }

  const selectedConversationData = conversations.find(
    c => getOtherUserId(c) === selectedConversation
  )

  return (
    <div className="messaging-panel">
      <div className="messaging-header">
        <h2>💬 Messages</h2>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
        <button 
          className="new-chat-btn"
          onClick={handleOpenNewChat}
          title="Start new chat"
        >
          ✏️
        </button>
      </div>

      <div className="messaging-container">
        {/* Conversations List */}
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <p>No conversations yet</p>
              <button className="start-btn" onClick={handleOpenNewChat}>
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map(conversation => {
              const otherId = getOtherUserId(conversation)
              const otherName = getOtherUserName(conversation)
              const isSelected = selectedConversation === otherId
              const hasUnread = conversation.unread_count > 0

              return (
                <div
                  key={conversation.id}
                  className={`conversation-item ${isSelected ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                  onClick={() => setSelectedConversation(otherId)}
                >
                  <div className="conversation-avatar">
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">{otherName}</div>
                    <div className="conversation-preview">
                      {conversation.latest_messages?.[0]?.message?.substring(0, 40) || 'No messages yet'}
                    </div>
                  </div>
                  {hasUnread && <div className="unread-dot"></div>}
                </div>
              )
            })
          )}
        </div>

        {/* Messages View */}
        {selectedConversation ? (
          <div className="messages-view">
            <div className="messages-header">
              <h3>
                {selectedConversationData ? getOtherUserName(selectedConversationData) : 'Loading...'}
              </h3>
            </div>

            <div className="messages-list">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.sender === user.id ? 'sent' : 'received'}`}>
                  <div className="message-bubble">
                    {msg.message}
                  </div>
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.is_read && msg.sender === user.id && (
                    <span className="read-indicator">✓✓</span>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                disabled={loading}
                className="message-input"
              />
              <button type="submit" disabled={loading || !messageInput.trim()} className="send-btn">
                {loading ? '⏳' : '➤'}
              </button>
            </form>
          </div>
        ) : (
          <div className="messages-view empty">
            <div className="empty-state">
              <p>📫 No conversation selected</p>
              <p>Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start New Conversation</h3>
              <button className="close-btn" onClick={() => setShowNewChat(false)}>×</button>
            </div>
            <div className="users-list">
              {availableUsers.length === 0 ? (
                <p className="empty-message">No users available</p>
              ) : (
                availableUsers.map(u => (
                  <div
                    key={u.id}
                    className="user-item"
                    onClick={() => startNewChat(u.id)}
                  >
                    <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <div className="user-name">{u.name}</div>
                      <div className="user-role">{u.role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
