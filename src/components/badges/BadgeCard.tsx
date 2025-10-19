/**
 * Badge Card Component
 * Displays a single badge with progress information
 */

'use client';

import React from 'react';
import {
  ChefHat,
  Globe,
  BookMarked,
  Crown,
  Star,
  Sparkles,
  Heart,
  Calendar,
  Flame,
  List,
  ShoppingCart,
  Mic,
  Bug,
  Brain,
  Calculator,
  Cake,
  Trophy,
  UserPlus,
  LucideIcon,
} from 'lucide-react';
import { Badge, BadgeTier } from '@/lib/badges';
import { formatTierLabel } from '@/lib/badges';

// Map badge icons to Lucide components
const iconMap: Record<string, LucideIcon> = {
  'chef-hat': ChefHat,
  globe: Globe,
  'book-marked': BookMarked,
  crown: Crown,
  star: Star,
  sparkles: Sparkles,
  heart: Heart,
  calendar: Calendar,
  flame: Flame,
  list: List,
  'shopping-cart': ShoppingCart,
  mic: Mic,
  bug: Bug,
  brain: Brain,
  calculator: Calculator,
  cake: Cake,
  trophy: Trophy,
  'user-plus': UserPlus,
};

interface BadgeCardProps {
  badge: Badge;
  currentTier?: BadgeTier | null;
  nextTier?: BadgeTier | null;
  currentValue?: number;
  earned?: boolean;
  awardedAt?: string;
}

export function BadgeCard({
  badge,
  currentTier,
  nextTier,
  currentValue = 0,
  earned = false,
  awardedAt,
}: BadgeCardProps) {
  const Icon = iconMap[badge.icon] || Trophy;

  // Calculate progress
  const progress = React.useMemo(() => {
    if (!nextTier) return 100; // Max tier reached
    if (!currentTier) {
      // Working toward first tier
      return Math.min(100, (currentValue / nextTier.threshold) * 100);
    }
    // Working toward next tier
    const range = nextTier.threshold - currentTier.threshold;
    const progressValue = currentValue - currentTier.threshold;
    return Math.min(100, Math.max(0, (progressValue / range) * 100));
  }, [currentTier, nextTier, currentValue]);

  const remainingToNext = nextTier ? nextTier.threshold - currentValue : 0;

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${
        earned
          ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`flex-shrink-0 p-3 rounded-full ${
            earned ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900">{badge.display_name}</h3>
          <p className="text-sm text-gray-600">{badge.description}</p>
        </div>

        {earned && currentTier && (
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Tier</div>
            <div className="font-bold text-amber-600">{formatTierLabel(currentTier.label)}</div>
          </div>
        )}
      </div>

      {/* Progress */}
      {nextTier && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {currentTier ? `Progress to ${nextTier.label}` : `Progress to ${nextTier.label}`}
            </span>
            <span className="font-semibold text-gray-900">
              {currentValue} / {nextTier.threshold}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {remainingToNext > 0 && (
            <p className="text-xs text-gray-500 text-center">
              {remainingToNext} more to reach {nextTier.label}
            </p>
          )}
        </div>
      )}

      {/* Max tier reached */}
      {!nextTier && earned && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
            <Trophy className="w-4 h-4" />
            <span>Max Tier Reached!</span>
          </div>
        </div>
      )}

      {/* Awarded date */}
      {earned && awardedAt && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs text-gray-500 text-center">
            Earned {new Date(awardedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}


