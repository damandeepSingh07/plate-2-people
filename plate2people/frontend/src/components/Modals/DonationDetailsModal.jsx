import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Modal.css';

export default function DonationDetailsModal({ donation, isOpen, onClose }) {
  if (!donation) return null;

  const getStatusColor = (status) => {
    const colors = {
      available: 'text-green-600 bg-green-50',
      requested: 'text-blue-600 bg-blue-50',
      assigned: 'text-purple-600 bg-purple-50',
      in_transit: 'text-yellow-600 bg-yellow-50',
      delivered: 'text-gray-600 bg-gray-50',
      expired: 'text-red-600 bg-red-50',
    };
    return colors[status] || colors.available;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusEmoji = (status) => {
    const emojis = {
      available: '📦',
      requested: '🔔',
      assigned: '👤',
      in_transit: '🚚',
      delivered: '✅',
      expired: '⏰',
    };
    return emojis[status] || '📦';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-6 flex justify-between items-start">
                <div>
                  <div className="text-sm text-blue-100 mb-1">Donation Details</div>
                  <h2 className="text-2xl font-bold">{donation.food_details}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Section */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Current Status
                  </h3>
                  <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(donation.status)}`}>
                    {getStatusEmoji(donation.status)} {donation.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Image */}
                {donation.food_image && (
                  <div className="rounded-lg overflow-hidden h-64 bg-gray-200">
                    <img
                      src={donation.food_image}
                      alt={donation.food_details}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Donor Info */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Donor</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {donation.donor_name}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      📦 {donation.quantity}
                    </p>
                  </div>

                  {/* Pickup Location */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pickup Location</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      📍 {donation.pickup_location}
                    </p>
                  </div>

                  {/* Expiry Time */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expires</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ⏰ {formatDateTime(donation.expiry_time)}
                    </p>
                  </div>

                  {/* Food Type */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Food Type</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {donation.food_type}
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg md:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      📅 {formatDateTime(donation.created_at)}
                    </p>
                  </div>

                  {/* Volunteer Info (if assigned) */}
                  {donation.volunteer_name && (
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg md:col-span-2">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Assigned Volunteer</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        👤 {donation.volunteer_name}
                      </p>
                    </div>
                  )}

                  {/* Delivery Date (if delivered) */}
                  {donation.status === 'delivered' && (
                    <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg md:col-span-2">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-1">Delivered</p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                        ✅ {formatDateTime(donation.updated_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {donation.notes && (
                  <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Notes</p>
                    <p className="text-gray-900 dark:text-white">
                      {donation.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={onClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
