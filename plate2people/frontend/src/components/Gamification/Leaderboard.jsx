/**
 * Leaderboard Component
 * Displays top users by points for the current period
 */
import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GamificationContext } from '../../context/GamificationContext';

const Leaderboard = () => {
  const { leaderboard, userRank, fetchLeaderboard, loading } = useContext(GamificationContext);
  const [period, setPeriod] = useState('weekly');
  const [role, setRole] = useState('volunteer');

  useEffect(() => {
    fetchLeaderboard(role, period);
  }, [role, period, fetchLeaderboard]);

  const getMedalEmoji = (rank) => {
    const emojis = ['🥇', '🥈', '🥉'];
    return emojis[rank - 1] || '⭐';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          🏆 Leaderboard
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Period Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="donor">Donors 🎁</option>
              <option value="volunteer">Volunteers 🚚</option>
              <option value="ngo">NGOs 🤝</option>
            </select>
          </div>
        </div>
      </div>

      {/* User's Current Rank */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">#{userRank.rank || '—'}</div>
              <p className="text-sm opacity-90">Your Rank</p>
            </div>
            <div>
              <div className="text-3xl font-bold">{userRank.points}</div>
              <p className="text-sm opacity-90">Points</p>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {period === 'weekly' ? '1 week' : period === 'monthly' ? '1 month' : '∞'}
              </div>
              <p className="text-sm opacity-90">Period</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Loading leaderboard...</p>
        </div>
      ) : leaderboard && leaderboard.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              variants={itemVariants}
              className={`relative overflow-hidden rounded-lg p-4 transition ${
                index === 0
                  ? 'bg-gradient-to-r from-yellow-300 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800'
                  : index === 1
                  ? 'bg-gradient-to-r from-gray-400 to-gray-200 dark:from-gray-700 dark:to-gray-600'
                  : index === 2
                  ? 'bg-gradient-to-r from-orange-400 to-orange-200 dark:from-orange-900 dark:to-orange-800'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Rank & User Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl font-bold w-8 text-center">
                    {getMedalEmoji(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {entry.user_name}
                    </h3>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {role === 'volunteer' && (
                        <>
                          {entry.deliveries_count} deliveries •{' '}
                          {entry.total_points} points
                        </>
                      )}
                      {role === 'donor' && (
                        <>
                          {entry.donations_count} donations •{' '}
                          {entry.total_points} points
                        </>
                      )}
                      {role === 'ngo' && (
                        <>
                          {entry.deliveries_count} assignments •{' '}
                          {entry.total_points} points
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Points Display */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {entry.total_points}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">pts</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-black bg-opacity-10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((entry.total_points / 5000) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300">No users on leaderboard yet.</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm text-gray-700 dark:text-gray-300">
        <p className="mb-2 font-semibold">💡 How to earn points?</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Post a donation: +5 points</li>
          <li>Post with photo: +3 bonus points</li>
          <li>Complete a delivery: +10 points</li>
          <li>NGO assignment: +15 points</li>
        </ul>
      </div>
    </div>
  );
};

export default Leaderboard;
