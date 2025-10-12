/**
 * Earn Badges Marketing Page
 * Showcases the badge system and motivates users to earn achievements
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Trophy, 
  ChefHat, 
  Globe, 
  BookMarked, 
  Crown, 
  Star, 
  Sparkles, 
  Heart, 
  Calendar, 
  Flame, 
  ShoppingCart, 
  ArrowRight,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function EarnBadgesPage() {
  const router = useRouter();

  const badgeHighlights = [
    {
      icon: ChefHat,
      name: 'Recipe Maker',
      description: 'Build your collection and become a master curator',
      tiers: ['25', '50', '100', '250'],
      color: 'from-amber-400 to-orange-500'
    },
    {
      icon: Sparkles,
      name: 'Original Creator',
      description: 'Showcase your creativity with original recipes',
      tiers: ['5', '20', '50'],
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Globe,
      name: 'Cuisine Explorer',
      description: 'Journey through flavors from around the world',
      tiers: ['3', '5', '7', '10'],
      color: 'from-blue-400 to-cyan-500'
    },
    {
      icon: Crown,
      name: 'Top Rated Chef',
      description: 'Earn trust with consistently excellent recipes',
      tiers: ['3', '10', '25'],
      color: 'from-yellow-400 to-amber-500'
    },
    {
      icon: ShoppingCart,
      name: 'List Legend',
      description: 'Master the art of meal planning',
      tiers: ['5', '20', '50'],
      color: 'from-green-400 to-emerald-500'
    },
    {
      icon: Heart,
      name: 'Crowd Favorite',
      description: 'Share recipes that others love',
      tiers: ['25', '100', '500'],
      color: 'from-rose-400 to-red-500'
    }
  ];

  const achievements = [
    {
      icon: Target,
      title: 'Set Your Goals',
      description: 'Track your progress toward each badge with visual progress bars'
    },
    {
      icon: TrendingUp,
      title: 'Level Up',
      description: 'Earn Bronze, Silver, Gold, Platinum, and Diamond tiers'
    },
    {
      icon: Award,
      title: 'Get Recognized',
      description: 'Celebrate every milestone with instant badge notifications'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-block p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-6">
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-orange-900 mb-4">
              Earn Badges & Celebrate Your Culinary Journey!
            </h1>
            <p className="text-xl text-orange-700 mb-8 max-w-3xl mx-auto">
              Turn your cooking passion into achievements! Earn beautiful badges as you create recipes, 
              plan meals, and explore cuisines. Every action brings you closer to your next milestone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push('/badges')}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg px-8 py-6"
              >
                <Trophy className="w-5 h-5 mr-2" />
                View Your Badges
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => router.push('/cookbook')}
                size="lg"
                variant="outline"
                className="border-2 border-orange-400 text-orange-700 hover:bg-orange-50 text-lg px-8 py-6"
              >
                Start Earning Now
              </Button>
            </div>
          </motion.div>

          {/* Why Badges Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
              Why Earn Badges?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full bg-white/80 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 text-center">
                        <div className="inline-block p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-4">
                          <Icon className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-orange-900 mb-2">
                          {achievement.title}
                        </h3>
                        <p className="text-orange-700">
                          {achievement.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Featured Badges */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-orange-900 text-center mb-4">
              Featured Badge Collection
            </h2>
            <p className="text-center text-orange-700 mb-8 max-w-2xl mx-auto">
              Discover 16 unique badges across multiple categories. Each badge has progressive tiers 
              – start with Bronze and work your way to Diamond!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badgeHighlights.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-orange-200 hover:shadow-xl transition-all hover:scale-105">
                      <CardContent className="p-6">
                        <div className={`inline-block p-3 bg-gradient-to-br ${badge.color} rounded-full mb-4`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-orange-900 mb-2">
                          {badge.name}
                        </h3>
                        <p className="text-sm text-orange-700 mb-4">
                          {badge.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {badge.tiers.map((tier, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold"
                            >
                              {tier}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* How to Earn Section */}
          <div className="mb-16">
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
                  How to Start Earning
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        1
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Add Recipes</h3>
                        <p className="text-orange-700 text-sm">
                          Import from websites or create your own original recipes. Each recipe counts toward your Recipe Maker badge!
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        2
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Plan Your Meals</h3>
                        <p className="text-orange-700 text-sm">
                          Use the calendar to schedule recipes throughout the week. Earn Monthly Meal Master badges!
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        3
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Generate Shopping Lists</h3>
                        <p className="text-orange-700 text-sm">
                          Create organized shopping lists from your meal plans. Work toward List Legend status!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        4
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Rate & Review</h3>
                        <p className="text-orange-700 text-sm">
                          Leave thoughtful reviews on recipes you try. Become a respected Recipe Judge!
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        5
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Explore Cuisines</h3>
                        <p className="text-orange-700 text-sm">
                          Cook recipes from different cuisines around the world. Unlock Cuisine Explorer badges!
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        6
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 mb-1">Share & Connect</h3>
                        <p className="text-orange-700 text-sm">
                          Share your recipes with friends. Watch your Crowd Favorite badge grow when others add them!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Badge Tiers Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
              Progressive Badge Tiers
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Bronze', color: 'from-amber-600 to-amber-700', emoji: '🥉' },
                { name: 'Silver', color: 'from-gray-300 to-gray-400', emoji: '🥈' },
                { name: 'Gold', color: 'from-yellow-400 to-yellow-500', emoji: '🥇' },
                { name: 'Platinum', color: 'from-cyan-400 to-blue-500', emoji: '💎' },
                { name: 'Diamond', color: 'from-purple-400 to-purple-600', emoji: '💎' }
              ].map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`bg-gradient-to-br ${tier.color} border-0`}>
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-2">{tier.emoji}</div>
                      <h3 className="font-bold text-white text-lg">
                        {tier.name}
                      </h3>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
              <CardContent className="p-12">
                <Trophy className="w-20 h-20 text-white mx-auto mb-6" />
                <h2 className="text-4xl font-bold text-white mb-4">
                  Ready to Start Your Badge Journey?
                </h2>
                <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of home cooks earning badges every day. Your first achievement is just one recipe away!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => router.push('/badges')}
                    size="lg"
                    className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View All Badges
                  </Button>
                  <Button
                    onClick={() => router.push('/add')}
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
                  >
                    <ChefHat className="w-5 h-5 mr-2" />
                    Add Your First Recipe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

