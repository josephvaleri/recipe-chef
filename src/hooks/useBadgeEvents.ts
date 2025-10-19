/**
 * Badge Events Hook
 * Provides easy integration for logging badge events throughout the app
 */

import { useCallback } from 'react';
import { logEventAndAward, logEvent, type UserEventType, type EventMeta } from '@/lib/badges';
import { useBadgeToast } from '@/components/badges/BadgeToast';

export function useBadgeEvents() {
  const { showBadgeAwards } = useBadgeToast();

  const logEventWithBadges = useCallback(async (
    type: UserEventType,
    meta: EventMeta = {},
    recipeId?: number,
    otherUserId?: string
  ) => {
    try {
      const result = await logEventAndAward(type, meta, recipeId, otherUserId);
      
      if (result && result.awards && result.awards.length > 0) {
        showBadgeAwards(result.awards);
      }
      
      return result;
    } catch (error) {
      console.error('Error logging badge event:', error);
      return null;
    }
  }, [showBadgeAwards]);

  const logEventOnly = useCallback(async (
    type: UserEventType,
    meta: EventMeta = {},
    recipeId?: number,
    otherUserId?: string
  ) => {
    try {
      return await logEvent(type, meta, recipeId, otherUserId);
    } catch (error) {
      console.error('Error logging event:', error);
      return null;
    }
  }, []);

  return {
    logEventWithBadges,
    logEventOnly,
  };
}
