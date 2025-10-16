"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, 
  Clock, 
  Users, 
  User, 
  MessageSquare,
  Eye,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getGroupSharedRecipes, type SharedRecipe as DBSharedRecipe } from "@/lib/community/shared-recipes";

interface SharedRecipe {
  id: number;
  recipe_id: number;
  recipe_title: string;
  recipe_image: string | null;
  recipe_total_time: string;
  recipe_servings: string;
  shared_by_id: string;
  shared_by_name: string;
  shared_by_handle: string;
  shared_by_avatar: string | null;
  message: string;
  shared_at: string;
  recipients: string[];
  share_type: "group" | "specific";
}

interface SharedRecipesListProps {
  groupSlug: string;
  groupId: number;
  refreshTrigger?: number;
}

export function SharedRecipesList({ groupSlug, groupId, refreshTrigger }: SharedRecipesListProps) {
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedRecipes();
  }, [groupId, refreshTrigger]);

  // Temporary function to clear mock data - remove after use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear mock shared recipes for all groups
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sharedRecipes_')) {
          localStorage.removeItem(key);
          console.log(`Cleared ${key}`);
        }
      });
    }
  }, []);

  const loadSharedRecipes = async () => {
    try {
      setLoading(true);
      
      // Load shared recipes from database
      const dbSharedRecipes = await getGroupSharedRecipes(groupId);
      
      // Transform to component format
      const transformedRecipes: SharedRecipe[] = dbSharedRecipes.map(db => ({
        id: db.shared_recipe_id,
        recipe_id: db.recipe_id,
        recipe_title: db.recipe_title,
        recipe_image: db.recipe_image_url,
        recipe_total_time: db.recipe_total_time || "",
        recipe_servings: db.recipe_servings || "",
        shared_by_id: db.shared_by_id,
        shared_by_name: db.shared_by_name,
        shared_by_handle: db.shared_by_handle || "",
        shared_by_avatar: db.shared_by_avatar_url,
        message: db.message || "",
        shared_at: db.shared_at,
        recipients: db.recipients,
        share_type: db.share_type,
      }));

      setSharedRecipes(transformedRecipes);
    } catch (error) {
      console.error("Error loading shared recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Shared Recipes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-orange-600">Loading shared recipes...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          Shared Recipes ({sharedRecipes.length})
        </CardTitle>
        <CardDescription>
          Recipes shared by group members
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sharedRecipes.length === 0 ? (
          <div className="text-center py-8">
            <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shared recipes yet</h3>
            <p className="text-muted-foreground">
              Group members haven't shared any recipes yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sharedRecipes.map((sharedRecipe) => (
                <motion.div
                  key={sharedRecipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-orange-100 rounded-lg p-3 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Recipe Name */}
                      <h3 className="font-semibold text-orange-900 truncate mb-1">
                        {sharedRecipe.recipe_title}
                      </h3>
                      
                      {/* User Handle, Total Time, Date */}
                      <div className="flex items-center gap-3 text-xs text-orange-600">
                        <span>@{sharedRecipe.shared_by_handle || sharedRecipe.shared_by_name.replace(/\s+/g, '').toLowerCase()}</span>
                        {sharedRecipe.recipe_total_time && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {sharedRecipe.recipe_total_time}
                            </div>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(sharedRecipe.shared_at)}</span>
                      </div>
                    </div>
                    
                    {/* View Button */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-3"
                      onClick={() => {
                        // Check if recipe exists before navigating
                        if (sharedRecipe.recipe_id && sharedRecipe.recipe_id > 0) {
                          window.location.href = `/recipe/${sharedRecipe.recipe_id}`;
                        } else {
                          alert('This recipe is no longer available.');
                        }
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
