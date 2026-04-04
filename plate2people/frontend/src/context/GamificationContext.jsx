/**
 * Gamification Context
 * Manages user points, badges, and leaderboard data
 */
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { api } from '../api/axios';

export const GamificationContext = createContext();

export function GamificationProvider({ children }) {
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user points
  const fetchUserPoints = useCallback(async () => {
    try {
      const response = await api.get(`/donations/gamification/user-points/`);
      setUserPoints(response.data.total_points || 0);
    } catch (err) {
      console.error('Error fetching points:', err);
      setError(err.message);
    }
  }, []);

  // Fetch user badges
  const fetchUserBadges = useCallback(async () => {
    try {
      const response = await api.get(`/donations/gamification/badges/`);
      setUserBadges(response.data.badges || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError(err.message);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (role = 'volunteer', period = 'weekly') => {
    try {
      setLoading(true);
      const response = await api.get(
        `/donations/gamification/leaderboard/`,
        { params: { role, period } }
      );
      setLeaderboard(response.data.leaderboard || []);
      setUserRank(response.data.user_rank || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUserPoints();
    fetchUserBadges();
    fetchLeaderboard();
  }, [fetchUserPoints, fetchUserBadges, fetchLeaderboard]);

  const value = {
    userPoints,
    userBadges,
    leaderboard,
    userRank,
    loading,
    error,
    fetchUserPoints,
    fetchUserBadges,
    fetchLeaderboard,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}
