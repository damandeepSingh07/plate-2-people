/**
 * Modern Donation Card Component
 * 3D hover animations with Framer Motion
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const DonationCard = ({ 
  donation, 
  onAccept, 
  onReject, 
  onChat,
  onMarkDelivered,
  onStartDelivery,
  onViewDetails,
  role,
  isActive = false,
  isCompleted = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      setError(null);
      await onAccept(donation.id);
    } catch (err) {
      setError(err.message || 'Failed to accept donation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleStartDelivery = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (onStartDelivery) {
        await onStartDelivery(donation.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to start delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDelivered = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (onMarkDelivered) {
        await onMarkDelivered(donation.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to mark delivered');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(donation);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      requested: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.available;
  };

  const containerVariants = {
    rest: {
      rotateX: 0,
      rotateY: 0,
      z: 0,
    },
    hover: {
      rotateX: 5,
      rotateY: 10,
      z: 20,
      transition: { duration: 0.3 },
    },
  };

  const shadowVariants = {
    rest: {
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={shadowVariants}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      className="h-full"
    >
      <motion.div
        variants={containerVariants}
        className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-full flex flex-col cursor-pointer border border-gray-200 dark:border-gray-700 transition-all"
        onClick={handleCardClick}
      >
        {/* Image Section */}
        <div className="relative h-48 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 overflow-hidden cursor-pointer"
             onClick={(e) => {
               e.stopPropagation();
               handleCardClick();
             }}>
          {donation.food_image ? (
            <img
              src={donation.food_image}
              alt={donation.food_details}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">🍽️</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                donation.status
              )}`}
            >
              {donation.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Overlay on hover */}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-white text-center"
              >
                <p className="text-sm font-semibold">👀 Click to view details</p>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Header */}
          <div className="mb-3">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
              {donation.food_details}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              by {donation.donor_name}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm mb-4 flex-1">
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <span className="mr-2">📦</span>
              <span>{donation.quantity}</span>
            </div>
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <span className="mr-2">📍</span>
              <span className="truncate">{donation.pickup_location}</span>
            </div>
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <span className="mr-2">⏰</span>
              <span>
                {donation.expiry_time
                  ? new Date(donation.expiry_time).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'No expiry'}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-xs">
              {error}
            </div>
          )}

          {/* Action Buttons — only volunteers can accept available donations */}
          {donation.status === 'available' && role === 'volunteer' && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept();
                }}
                disabled={isAccepting}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAccepting ? '✓ Accepting...' : '✓ Accept'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(donation.id);
                }}
                className="flex-1 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-900 font-semibold py-2 rounded-lg transition"
              >
                ✕ Reject
              </motion.button>
            </div>
          )}

          {/* Donor sees status indicator instead of accept button */}
          {donation.status === 'available' && role === 'donor' && (
            <div className="flex items-center gap-2 py-2 px-3 bg-green-50 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-green-700">Waiting for a volunteer to accept</span>
            </div>
          )}

          {/* Donor sees assigned status + chat button */}
          {donation.status === 'assigned' && role === 'donor' && donation.volunteer && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-2 px-3 bg-purple-50 rounded-lg">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-purple-700">📦 Assigned to {donation.volunteer_name || 'a volunteer'}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(donation);
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition"
              >
                💬 Chat with {donation.volunteer_name || 'Volunteer'}
              </motion.button>
            </div>
          )}

          {/* For assigned donations (volunteer view) */}
          {isActive && donation.status === 'assigned' && role === 'volunteer' && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartDelivery();
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Starting...' : '🚚 Start Delivery'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(donation);
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition"
              >
                💬 Chat
              </motion.button>
            </div>
          )}

          {/* For in-transit donations — volunteer can mark delivered */}
          {donation.status === 'in_transit' && role === 'volunteer' && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkDelivered();
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '⏳ Completing...' : '✅ Mark Delivered'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(donation);
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition"
              >
                💬 Chat
              </motion.button>
            </div>
          )}

          {/* Donor/NGO sees in-transit status + chat button */}
          {donation.status === 'in_transit' && role === 'donor' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-2 px-3 bg-yellow-50 rounded-lg">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-yellow-700">🚚 In Transit — Delivery in progress</span>
              </div>
              {donation.volunteer && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChat?.(donation);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  💬 Chat with {donation.volunteer_name || 'Volunteer'}
                </motion.button>
              )}
            </div>
          )}

          {/* NGO sees in-transit status */}
          {donation.status === 'in_transit' && role === 'ngo' && (
            <div className="flex items-center gap-2 py-2 px-3 bg-yellow-50 rounded-lg">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-yellow-700">🚚 In Transit — Delivery in progress</span>
            </div>
          )}

          {/* For completed donations */}
          {isCompleted && donation.status === 'delivered' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 rounded-lg transition"
            >
              📋 View Details
            </motion.button>
          )}

          {/* Default view for other status (requested, expired, etc) */}
          {donation.status !== 'available' && 
           donation.status !== 'assigned' &&
           !isActive && 
           !isCompleted && 
           donation.status !== 'in_transit' && 
           donation.status !== 'expired' && 
           role !== 'donor' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onChat?.(donation);
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition"
            >
              💬 Chat with {donation.donor_name}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DonationCard;
