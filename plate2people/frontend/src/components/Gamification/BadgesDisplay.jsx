/**
 * Badges Display Component — Enhanced with 20+ badge types
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import './BadgesDisplay.css';

const ALL_BADGE_DEFS = [
  // ── Donor Badges ──────────────────────────────────────────────
  { id: 'first_donation',   name: 'First Donation',   icon: '🎉', category: 'Donor',     description: 'Posted your first food donation',       rarity: 'common',    color: '#f97316' },
  { id: 'food_hero',        name: 'Food Hero',         icon: '🦸', category: 'Donor',     description: 'Posted 10 food donations',               rarity: 'uncommon',  color: '#ef4444' },
  { id: 'golden_donor',     name: 'Golden Donor',      icon: '👑', category: 'Donor',     description: 'Posted 50+ food donations',              rarity: 'legendary', color: '#f59e0b' },
  { id: 'generous_heart',   name: 'Generous Heart',    icon: '💝', category: 'Donor',     description: 'Donated more than 100 kg of food',      rarity: 'rare',      color: '#ec4899' },
  { id: 'feast_giver',      name: 'Feast Giver',       icon: '🍽️', category: 'Donor',     description: 'Donated a single batch of 50+ meals',   rarity: 'uncommon',  color: '#f97316' },
  { id: 'restaurant_hero',  name: 'Restaurant Hero',   icon: '🏪', category: 'Donor',     description: 'Donor from a restaurant or canteen',     rarity: 'common',    color: '#8b5cf6' },

  // ── Volunteer Badges ──────────────────────────────────────────
  { id: 'delivery_starter', name: 'Delivery Starter',  icon: '🚀', category: 'Volunteer', description: 'Completed your first delivery',          rarity: 'common',    color: '#3b82f6' },
  { id: 'delivery_master',  name: 'Delivery Master',   icon: '⚡', category: 'Volunteer', description: 'Completed 25 deliveries',               rarity: 'uncommon',  color: '#6366f1' },
  { id: 'delivery_legend',  name: 'Delivery Legend',   icon: '🌟', category: 'Volunteer', description: 'Completed 100 deliveries',              rarity: 'legendary', color: '#7c3aed' },
  { id: 'speed_rider',      name: 'Speed Rider',       icon: '🏎️', category: 'Volunteer', description: 'Completed delivery within 30 mins',     rarity: 'rare',      color: '#0ea5e9' },
  { id: 'night_guardian',   name: 'Night Guardian',    icon: '🌙', category: 'Volunteer', description: 'Made a delivery after 10 PM',           rarity: 'uncommon',  color: '#1e3a8a' },
  { id: 'weekend_warrior',  name: 'Weekend Warrior',   icon: '💪', category: 'Volunteer', description: 'Delivered on 5 consecutive weekends',   rarity: 'rare',      color: '#16a34a' },

  // ── NGO Badges ────────────────────────────────────────────────
  { id: 'ngo_partner',      name: 'NGO Partner',       icon: '🤝', category: 'NGO',       description: 'First NGO assignment completed',         rarity: 'common',    color: '#059669' },
  { id: 'ngo_champion',     name: 'NGO Champion',      icon: '🏆', category: 'NGO',       description: 'Completed 50 NGO assignments',           rarity: 'legendary', color: '#d97706' },
  { id: 'community_pillar', name: 'Community Pillar',  icon: '🏛️', category: 'NGO',       description: 'Served 1000+ meals through NGO',        rarity: 'legendary', color: '#7c3aed' },
  { id: 'shelter_builder',  name: 'Shelter Builder',   icon: '🏠', category: 'NGO',       description: 'Onboarded first shelter partnership',   rarity: 'rare',      color: '#0891b2' },

  // ── Streak & Engagement Badges ────────────────────────────────
  { id: 'week_streak',      name: '7-Day Streak',      icon: '🔥', category: 'Streak',    description: 'Active on the platform 7 days in a row', rarity: 'uncommon', color: '#f97316' },
  { id: 'month_hero',       name: 'Month Hero',        icon: '📅', category: 'Streak',    description: 'Active every week for a full month',    rarity: 'rare',      color: '#d946ef' },

  // ── Community Badges ──────────────────────────────────────────
  { id: 'early_bird',       name: 'Early Bird',        icon: '🐦', category: 'Special',   description: 'Among the first 100 users to join',     rarity: 'legendary', color: '#0891b2' },
  { id: 'zero_waste',       name: 'Zero Waste',        icon: '♻️', category: 'Special',   description: 'Every donation you posted was claimed', rarity: 'rare',      color: '#16a34a' },
  { id: 'chat_champion',    name: 'Chat Champion',     icon: '💬', category: 'Special',   description: 'Sent 100 messages to coordinate donations', rarity: 'uncommon', color: '#3b82f6' },
  { id: 'map_navigator',    name: 'Map Navigator',     icon: '🗺️', category: 'Special',   description: 'Used live tracking on 10 deliveries',   rarity: 'uncommon',  color: '#0ea5e9' },
];

const RARITY_CONFIG = {
  common:    { label: 'Common',    bg: 'linear-gradient(135deg,#6b7280,#9ca3af)', glow: '0 0 24px rgba(107,114,128,0.4)' },
  uncommon:  { label: 'Uncommon',  bg: 'linear-gradient(135deg,#16a34a,#22c55e)', glow: '0 0 24px rgba(34,197,94,0.45)' },
  rare:      { label: 'Rare',      bg: 'linear-gradient(135deg,#2563eb,#60a5fa)', glow: '0 0 28px rgba(96,165,250,0.5)' },
  legendary: { label: 'Legendary', bg: 'linear-gradient(135deg,#f59e0b,#f97316)', glow: '0 0 36px rgba(249,115,22,0.55)' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const badgeVariants = {
  hidden:   { opacity: 0, scale: 0.7, y: 20 },
  visible:  { opacity: 1, scale: 1,   y: 0,  transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

function BadgeCard({ badge, earned }) {
  const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;
  return (
    <motion.div
      variants={badgeVariants}
      whileHover={earned ? { y: -6, scale: 1.04 } : { scale: 1.02 }}
      className={`badge-card ${earned ? 'earned' : 'locked'} rarity-${badge.rarity}`}
      style={{ '--badge-color': badge.color, '--badge-glow': rarity.glow, '--badge-bg': rarity.bg }}
    >
      <div className="badge-icon-wrap">
        <span className="badge-icon">{badge.icon}</span>
        {earned && <div className="badge-shine" />}
        {!earned && <div className="badge-lock-overlay">🔒</div>}
      </div>
      <div className="badge-rarity-chip">{rarity.label}</div>
      <p className="badge-name">{badge.name}</p>
      <p className="badge-desc">{badge.description}</p>
      <div className="badge-category">{badge.category}</div>
    </motion.div>
  );
}

const BadgesDisplay = ({ userId = null }) => {
  const [earnedIds, setEarnedIds] = useState(new Set());
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        const endpoint = userId
          ? `/donations/gamification/badges/?user_id=${userId}`
          : `/donations/gamification/badges/`;
        const response = await api.get(endpoint);
        const ids = new Set((response.data.badges || []).map(b => b.id || b.code));
        setEarnedIds(ids);
      } catch (err) {
        console.error('Error fetching badges:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, [userId]);

  const CATEGORIES = ['all', ...new Set(ALL_BADGE_DEFS.map(b => b.category))];

  const displayed = ALL_BADGE_DEFS.filter(b =>
    activeTab === 'all' || b.category === activeTab
  );
  const earned  = displayed.filter(b => earnedIds.has(b.id));
  const locked  = displayed.filter(b => !earnedIds.has(b.id));

  if (loading) {
    return (
      <div className="badges-loading">
        <div className="badges-spinner">⏳</div>
        <p>Loading badges…</p>
      </div>
    );
  }

  return (
    <div className="badges-display">
      {/* Header */}
      <div className="badges-header">
        <h2>🏅 Achievement Badges</h2>
        <p>{earnedIds.size} / {ALL_BADGE_DEFS.length} earned</p>
        <div className="badges-progress-bar">
          <div
            className="badges-progress-fill"
            style={{ width: `${(earnedIds.size / ALL_BADGE_DEFS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="badges-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`badges-tab ${activeTab === cat ? 'active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="badges-section">
          <h3 className="badges-section-title">✨ Earned ({earned.length})</h3>
          <motion.div className="badges-grid" variants={containerVariants} initial="hidden" animate="visible">
            {earned.map(b => <BadgeCard key={b.id} badge={b} earned />)}
          </motion.div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="badges-section">
          <h3 className="badges-section-title">🔒 Locked ({locked.length})</h3>
          <motion.div className="badges-grid" variants={containerVariants} initial="hidden" animate="visible">
            {locked.map(b => <BadgeCard key={b.id} badge={b} earned={false} />)}
          </motion.div>
        </div>
      )}

      {earned.length === 0 && locked.length === 0 && (
        <div className="badges-empty">
          <span>🎯</span>
          <p>No badges in this category yet!</p>
        </div>
      )}
    </div>
  );
};

export default BadgesDisplay;
