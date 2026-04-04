/**
 * Custom Hooks for Socket.io and other features
 */

import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import { GamificationContext } from '../context/GamificationContext';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Hook to use Socket.io functionality
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

/**
 * Hook to use Gamification features
 */
export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}

/**
 * Hook to use Theme (dark/light mode)
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * Hook for donations real-time sync
 */
export function useDonationSync(donationId) {
  const { socketService, isConnected } = useSocket();

  const acceptDonation = async () => {
    if (!isConnected) throw new Error('Socket not connected');
    return socketService.acceptDonation(donationId);
  };

  const rejectDonation = async () => {
    if (!isConnected) throw new Error('Socket not connected');
    return socketService.rejectDonation(donationId);
  };

  const onStatusChange = (callback) => {
    socketService.onDonationStatusChanged((data) => {
      if (data.donation_id === donationId) {
        callback(data);
      }
    });
  };

  const onVolunteerAssigned = (callback) => {
    socketService.onVolunteerAssigned((data) => {
      if (data.donation_id === donationId) {
        callback(data);
      }
    });
  };

  return {
    acceptDonation,
    rejectDonation,
    onStatusChange,
    onVolunteerAssigned,
  };
}

/**
 * Hook for real-time chat
 */
export function useDonationChat(donationId, recipientId) {
  const { socketService, isConnected } = useSocket();

  const sendMessage = async (message) => {
    if (!isConnected) throw new Error('Socket not connected');
    return socketService.sendChatMessage(donationId, message);
  };

  const startTyping = () => {
    if (isConnected) {
      socketService.startTyping(donationId);
    }
  };

  const stopTyping = () => {
    if (isConnected) {
      socketService.stopTyping(donationId);
    }
  };

  const markAsRead = (messageId) => {
    if (isConnected) {
      socketService.markMessageAsRead(messageId);
    }
  };

  const onNewMessage = (callback) => {
    socketService.onChatMessage((data) => {
      if (data.donation_id === donationId || data.conversation_id?.includes(donationId)) {
        callback(data);
      }
    });
  };

  const onUserTyping = (callback) => {
    socketService.onUserTyping((data) => {
      if (data.donation_id === donationId) {
        callback(data);
      }
    });
  };

  return {
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    onNewMessage,
    onUserTyping,
  };
}

/**
 * Hook for volunteer location tracking
 */
export function useLocationTracking(donationId) {
  const { socketService, isConnected } = useSocket();

  const updateLocation = (latitude, longitude) => {
    if (isConnected) {
      socketService.updateLocation(latitude, longitude, donationId);
    }
  };

  const onVolunteerLocationUpdated = (callback) => {
    socketService.onVolunteerLocationUpdated((data) => {
      if (data.donation_id === donationId) {
        callback(data);
      }
    });
  };

  return {
    updateLocation,
    trackLocation: updateLocation,
    onVolunteerLocationUpdated,
  };
}

/**
 * Hook for gamification notifications
 */
export function useGamificationNotifications() {
  const { socketService } = useSocket();

  const onBadgeEarned = (callback) => {
    socketService.onBadgeEarned(callback);
  };

  const onPointsAwarded = (callback) => {
    socketService.onPointsAwarded(callback);
  };

  const onNewMessage = (callback) => {
    socketService.onNewMessage(callback);
  };

  return {
    onBadgeEarned,
    onPointsAwarded,
    onNewMessage,
  };
}

/**
 * Hook for payment notifications - REMOVED (Monetary donations no longer supported)
 */
