/**
 * Badge Award Toast Notification
 * Displays when user earns a new badge or upgrades a tier
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, X, Sparkles } from 'lucide-react';
import { BadgeAward, formatTierLabel } from '@/lib/badges';

interface BadgeToastProps {
  awards: BadgeAward[];
  onClose: () => void;
  duration?: number;
}

export function BadgeToast({ awards, onClose, duration = 5000 }: BadgeToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Allow fade animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (awards.length === 0) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="relative">
              <Trophy className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1">
              {awards.length === 1 ? 'Badge Earned!' : `${awards.length} Badges Earned!`}
            </h3>
            
            <div className="space-y-2">
              {awards.map((award, index) => (
                <div key={index} className="text-sm">
                  <span className="font-semibold capitalize">
                    {award.badge_code.replace(/_/g, ' ')}
                  </span>
                  {' - '}
                  <span>{formatTierLabel(award.label)}</span>
                  {award.upgraded && (
                    <span className="ml-1 text-xs opacity-90">(Upgraded!)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BADGE TOAST PROVIDER (CONTEXT)
// ==========================================

interface BadgeToastContextValue {
  showBadgeAwards: (awards: BadgeAward[]) => void;
}

const BadgeToastContext = React.createContext<BadgeToastContextValue | null>(null);

export function BadgeToastProvider({ children }: { children: React.ReactNode }) {
  const [awards, setAwards] = useState<BadgeAward[]>([]);

  const showBadgeAwards = (newAwards: BadgeAward[]) => {
    if (newAwards && newAwards.length > 0) {
      setAwards(newAwards);
    }
  };

  const handleClose = () => {
    setAwards([]);
  };

  return (
    <BadgeToastContext.Provider value={{ showBadgeAwards }}>
      {children}
      {awards.length > 0 && <BadgeToast awards={awards} onClose={handleClose} />}
    </BadgeToastContext.Provider>
  );
}

export function useBadgeToast() {
  const context = React.useContext(BadgeToastContext);
  if (!context) {
    throw new Error('useBadgeToast must be used within BadgeToastProvider');
  }
  return context;
}

