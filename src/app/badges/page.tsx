/**
 * Badges Page
 * Displays user's earned badges and progress toward next tiers
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Award, Target, TrendingUp } from 'lucide-react';
import { BadgeCard } from '@/components/badges/BadgeCard';
import {
  getBadges,
  getBadgeTiers,
  getUserBadges,
  getBadgeProgress,
  getCurrentTier,
  getNextTier,
  type Badge,
  type BadgeTier,
  type UserBadge,
  type BadgeProgress,
} from '@/lib/badges';

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [tiers, setTiers] = useState<BadgeTier[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [progress, setProgress] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earned' | 'all'>('all');

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const [badgesData, tiersData, userBadgesData, progressData] = await Promise.all([
        getBadges(),
        getBadgeTiers(),
        getUserBadges(),
        getBadgeProgress(),
      ]);

      setBadges(badgesData);
      setTiers(tiersData);
      setUserBadges(userBadgesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group badges by family
  const badgesByFamily = React.useMemo(() => {
    const groups: Record<string, Badge[]> = {
      cooking: [],
      collecting: [],
      quality: [],
      community: [],
      creativity: [],
      planning: [],
      expertise: [],
      exploration: [],
      tools: [],
      technology: [],
      ai: [],
      seasonal: [],
      other: [],
    };

    badges.forEach((badge) => {
      const family = badge.family || 'other';
      if (!groups[family]) {
        groups[family] = [];
      }
      groups[family].push(badge);
    });

    return groups;
  }, [badges]);

  const earnedBadges = React.useMemo(() => {
    return badges
      .map((badge) => {
        const userBadge = userBadges.find((ub) => ub.badge_code === badge.badge_code);
        if (!userBadge) return null;

        const currentTier = getCurrentTier(badge.badge_code, userBadge.current_tier, tiers);
        return { badge, userBadge, currentTier };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [badges, userBadges, tiers]);

  const progressMap: Record<string, number> = {
    recipe_maker: progress?.recipe_maker || 0,
    curator: progress?.curator || 0,
    list_legend: progress?.list_legend || 0,
    conversion_wizard: progress?.conversion_wizard || 0,
    chef_tony_apprentice: progress?.chef_tony_apprentice || 0,
    cuisine_explorer: progress?.cuisine_explorer || 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-gray-600">Loading your badges...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayedBadges = activeTab === 'earned' ? earnedBadges.map((eb) => eb.badge) : badges;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Badges</h1>
              <p className="text-gray-600">
                Track your achievements and progress in Recipe Chef
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-gray-600">Earned</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{earnedBadges.length}</div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Progress</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {badges.length > 0 ? Math.round((earnedBadges.length / badges.length) * 100) : 0}%
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600">Total Tiers</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {earnedBadges.reduce((sum, eb) => sum + eb.userBadge.current_tier, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'all'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Badges ({badges.length})
          </button>
          <button
            onClick={() => setActiveTab('earned')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'earned'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Earned ({earnedBadges.length})
          </button>
        </div>

        {/* Badge Grid */}
        {Object.entries(badgesByFamily).map(([family, familyBadges]) => {
          if (familyBadges.length === 0) return null;

          // Filter by tab
          const filteredBadges =
            activeTab === 'earned'
              ? familyBadges.filter((badge) =>
                  userBadges.some((ub) => ub.badge_code === badge.badge_code)
                )
              : familyBadges;

          if (filteredBadges.length === 0) return null;

          return (
            <div key={family} className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                {family.replace(/_/g, ' ')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBadges.map((badge) => {
                  const userBadge = userBadges.find((ub) => ub.badge_code === badge.badge_code);
                  const currentTierObj = userBadge
                    ? getCurrentTier(badge.badge_code, userBadge.current_tier, tiers)
                    : null;
                  const nextTierObj = getNextTier(
                    badge.badge_code,
                    userBadge?.current_tier || null,
                    tiers
                  );
                  const currentValue = progressMap[badge.badge_code] || 0;

                  return (
                    <BadgeCard
                      key={badge.badge_code}
                      badge={badge}
                      currentTier={currentTierObj}
                      nextTier={nextTierObj}
                      currentValue={currentValue}
                      earned={!!userBadge}
                      awardedAt={userBadge?.awarded_at}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {activeTab === 'earned' && earnedBadges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No badges earned yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Start using Recipe Chef to earn badges! Add recipes, plan meals, and explore
              features to unlock achievements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


