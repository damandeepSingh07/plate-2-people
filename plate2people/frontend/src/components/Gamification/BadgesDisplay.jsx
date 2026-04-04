/**
 * Badges Display Component
 * Shows user's earned badges with animations
 */
import React, { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/axios";

const BadgesDisplay = ({ userId = null }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        const endpoint = userId
          ? `/donations/gamification/badges/?user_id=${userId}`
          : `/donations/gamification/badges/`;

        const response = await api.get(endpoint);
        setBadges(response.data.badges || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching badges:", err);
        setError("Failed to load badges");
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 },
    },
    hover: {
      scale: 1.2,
      rotate: 10,
      transition: { duration: 0.2 },
    },
  };

  const lockedBadgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 },
    },
  };

  const allBadges = [
    {
      id: "first_donation",
      name: "First Donation",
      icon: "🎉",
      description: "Post your first food donation",
      earned: badges.some(
        (b) => b.id === "first_donation" || b.code === "first_donation",
      ),
    },
    {
      id: "food_hero",
      name: "Food Hero",
      icon: "🦸",
      description: "Post 10 food donations",
      earned: badges.some(
        (b) => b.id === "food_hero" || b.code === "food_hero",
      ),
    },
    {
      id: "golden_donor",
      name: "Golden Donor",
      icon: "👑",
      description: "Post 50+ food donations",
      earned: badges.some(
        (b) => b.id === "golden_donor" || b.code === "golden_donor",
      ),
    },
    {
      id: "delivery_starter",
      name: "Delivery Starter",
      icon: "🚀",
      description: "Complete your first delivery",
      earned: badges.some(
        (b) => b.id === "delivery_starter" || b.code === "delivery_starter",
      ),
    },
    {
      id: "delivery_master",
      name: "Delivery Master",
      icon: "⚡",
      description: "Complete 25 deliveries",
      earned: badges.some(
        (b) => b.id === "delivery_master" || b.code === "delivery_master",
      ),
    },
    {
      id: "delivery_legend",
      name: "Delivery Legend",
      icon: "🌟",
      description: "Complete 100 deliveries",
      earned: badges.some(
        (b) => b.id === "delivery_legend" || b.code === "delivery_legend",
      ),
    },
    {
      id: "ngo_partner",
      name: "NGO Partner",
      icon: "🤝",
      description: "Complete your first NGO assignment",
      earned: badges.some(
        (b) => b.id === "ngo_partner" || b.code === "ngo_partner",
      ),
    },
    {
      id: "ngo_champion",
      name: "NGO Champion",
      icon: "🏆",
      description: "Complete 50 NGO assignments",
      earned: badges.some(
        (b) => b.id === "ngo_champion" || b.code === "ngo_champion",
      ),
    },
  ];

  const earnedBadges = allBadges.filter((b) => b.earned);
  const lockedBadges = allBadges.filter((b) => !b.earned);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin text-4xl">⏳</div>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Loading badges...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            🏅 Your Badges ({earnedBadges.length})
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {earnedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                variants={badgeVariants}
                whileHover="hover"
                className="flex flex-col items-center group cursor-pointer"
              >
                <div className="relative">
                  <motion.div
                    className="text-5xl bg-gradient-to-br from-yellow-300 to-orange-400 dark:from-yellow-500 dark:to-orange-600 p-6 rounded-full shadow-lg hover:shadow-xl transition"
                    whileHover={{ scale: 1.1 }}
                  >
                    {badge.icon}
                  </motion.div>

                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-yellow-300 opacity-0 group-hover:opacity-30 dark:group-hover:opacity-20 rounded-full blur-xl transition" />
                </div>

                <p className="mt-3 text-center text-sm font-bold text-gray-900 dark:text-white">
                  {badge.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">
                  {badge.description}
                </p>

                {/* Tooltip on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-0 right-0 translate-y-full mt-2 pointer-events-none"
                >
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded p-2 whitespace-nowrap">
                    Achieved! ✓
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            🔒 Locked Badges ({lockedBadges.length})
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {lockedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                variants={lockedBadgeVariants}
                className="flex flex-col items-center group cursor-pointer opacity-60"
              >
                <div className="relative">
                  <motion.div
                    className="text-5xl bg-gray-300 dark:bg-gray-600 p-6 rounded-full shadow opacity-60 group-hover:opacity-80 transition"
                    whileHover={{ scale: 1.05 }}
                  >
                    {badge.icon}
                  </motion.div>

                  {/* Lock icon */}
                  <div className="absolute top-0 right-0 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs">
                    🔒
                  </div>
                </div>

                <p className="mt-3 text-center text-sm font-bold text-gray-700 dark:text-gray-400">
                  {badge.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">
                  {badge.description}
                </p>

                {/* Tooltip on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-0 right-0 translate-y-full mt-2 pointer-events-none"
                >
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded p-2 whitespace-nowrap">
                    Not earned yet
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* No Badges */}
      {allBadges.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🎯</div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Start donating or volunteering to earn badges!
          </p>
        </div>
      )}
    </div>
  );
};

export default BadgesDisplay;
