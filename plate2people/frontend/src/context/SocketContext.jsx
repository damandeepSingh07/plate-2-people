/**
 * Socket Context
 * Provides socket instance and methods to entire app
 * ENHANCED: Graceful fallback when Socket.io server unavailable
 */
import React, { createContext, useCallback, useEffect, useState } from 'react';
import socketService from '../services/socketService';

export const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    // Get auth token
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Connect socket
    socketService.connect(token);

    // Listen for connection
    socketService.on('socket:connected', ({ socketId: id }) => {
      console.log('✅ Socket connected successfully');
      setSocketId(id);
      setIsConnected(true);
      setIsAvailable(true);
      setError(null);
    });

    // Listen for disconnection
    socketService.on('socket:disconnected', ({ reason } = {}) => {
      console.warn('⚠️  Socket disconnected:', reason);
      setIsConnected(false);
      setSocketId(null);
    });

    // Listen for connection errors
    socketService.on('socket:connection_error', ({ error: err }) => {
      console.error('❌ Connection error:', err);
      setError(err);
      setIsAvailable(false);
    });

    // Listen for general socket errors
    socketService.on('socket:error', ({ error: err }) => {
      console.error('❌ Socket error:', err);
      setError(err);
    });

    // Listen for unavailable
    socketService.on('socket:unavailable', () => {
      console.warn('⚠️  Socket.io server is unavailable. App will work without real-time features.');
      setIsAvailable(false);
      setIsConnected(false);
      // Don't treat as fatal error - app can still work
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const value = {
    isConnected,
    socketId,
    error,
    isAvailable, // NEW: indicates if Socket.io server is available
    socketService,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
