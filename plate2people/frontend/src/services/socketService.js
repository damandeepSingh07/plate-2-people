/**
 * Socket.io Client Service
 * Handles real-time communication with backend
 * ENHANCED: Graceful fallback when Socket.io server is unavailable
 */
import io from 'socket.io-client';

// Try to get Socket URL from environment, default to Django backend
// Socket.io can run on same port as Django (port 8000 with proper setup)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.isConnected = false;
    this.isAvailable = true; // Track if Socket server is available
    this.connectionAttempted = false;
  }

  /**
   * Initialize Socket connection with JWT token
   * ENHANCED: Handles missing Socket.io server gracefully
   */
  connect(token) {
    if (this.socket?.connected) return;
    if (this.connectionAttempted && !this.isAvailable) {
      console.warn('⚠️  Socket.io server is not available. Running in compatibility mode.');
      return null;
    }

    this.connectionAttempted = true;

    try {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 3, // Reduced from 5 to fail faster
        connectTimeout: 5000,
        forceNew: false,
      });

      this.setupDefaultListeners();
      return this.socket;
    } catch (error) {
      console.error('❌ Failed to initialize Socket.io:', error.message);
      this.isAvailable = false;
      this.emit('socket:unavailable');
      return null;
    }
  }

  /**
   * Setup default connection listeners
   * ENHANCED: Better error handling and logging
   */
  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.io connected:', this.socket.id);
      this.isConnected = true;
      this.isAvailable = true;
      this.emit('socket:connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️  Socket.io disconnected:', reason);
      this.isConnected = false;
      this.emit('socket:disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error.message);
      // If port 3001, suggest port 8000 instead
      if (SOCKET_URL.includes('3001')) {
        console.error('💡 Socket.io server on port 3001 not found. Try setting VITE_SOCKET_URL to http://localhost:8000');
      }
      this.isAvailable = false;
      this.emit('socket:connection_error', { error: error.message });
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket.io error:', error);
      this.emit('socket:error', { error });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Subscribe to event
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Also setup socket listener if it's a socket event
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from event
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Emit local event
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Send event to server
   * ENHANCED: Better logging when unavailable
   */
  send(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    } else if (!this.isAvailable) {
      console.warn(`⚠️  Socket.io unavailable. Event '${event}' not sent.`);
      return false;
    } else {
      console.warn(`⚠️  Socket not connected. Event '${event}' queued.`);
      return false;
    }
  }

  /**
   * Send with acknowledgment
   * ENHANCED: Better error handling
   */
  sendWithAck(event, data) {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.socket.emit(event, data, (response) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(response?.error || 'Unknown error');
          }
        });
      } else if (!this.isAvailable) {
        reject(`Socket.io server unavailable. Event '${event}' failed.`);
      } else {
        reject(`Socket not connected. Event '${event}' failed.`);
      }
    });
  }

  // ============ DONATION EVENTS ============

  acceptDonation(donationId) {
    return this.sendWithAck('donation:accept', { donation_id: donationId });
  }

  rejectDonation(donationId) {
    return this.sendWithAck('donation:reject', { donation_id: donationId });
  }

  onDonationCreated(callback) {
    this.on('donation:created', callback);
  }

  onDonationStatusChanged(callback) {
    this.on('donation:status_changed', callback);
  }

  onVolunteerAssigned(callback) {
    this.on('donation:volunteer_assigned', callback);
  }

  onDonationDelivered(callback) {
    this.on('donation:delivered', callback);
  }

  // ============ CHAT EVENTS ============

  sendChatMessage(donationId, message) {
    return this.sendWithAck('chat:message', {
      donation_id: donationId,
      message,
    });
  }

  startTyping(donationId) {
    this.send('chat:typing_start', { donation_id: donationId });
  }

  stopTyping(donationId) {
    this.send('chat:typing_stop', { donation_id: donationId });
  }

  markMessageAsRead(messageId) {
    this.send('chat:message_read', { message_id: messageId });
  }

  onChatMessage(callback) {
    this.on('chat:message', callback);
  }

  onUserTyping(callback) {
    this.on('chat:user_typing', callback);
  }

  onUserStoppedTyping(callback) {
    this.on('chat:user_stopped_typing', callback);
  }

  onMessageRead(callback) {
    this.on('chat:message_read', callback);
  }

  // ============ LOCATION EVENTS ============

  updateLocation(latitude, longitude, donationId) {
    this.send('location:update', {
      latitude,
      longitude,
      donation_id: donationId,
    });
  }

  onVolunteerLocationUpdated(callback) {
    this.on('location:volunteer_updated', callback);
  }

  // ============ NOTIFICATION EVENTS ============

  onBadgeEarned(callback) {
    this.on('notification:badge_earned', callback);
  }

  onPointsAwarded(callback) {
    this.on('notification:points_awarded', callback);
  }

  onNewMessage(callback) {
    this.on('notification:new_message', callback);
  }

  // ============ PAYMENT EVENTS - REMOVED (Monetary donations no longer supported) ============

}

export default new SocketService();
