// app/community/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { RouteGuard } from "@/components/route-guard";
import CommunityLayoutsPreview from "@/components/community/CommunityLayoutsPreview";
import { supabase } from "@/lib/supabase";

type GlobalRecipeItem = {
  user_recipe_id: number;
  title: string | null;
  author_id: string | null;
  accepted_at: string | null;
  author_name?: string | null;
};

type GroupCard = {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
};

export default function CommunityPage() {
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipeItem[]>([]);
  const [myGroups, setMyGroups] = useState<GroupCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch global recipes
        const { data: recipesData, error: recipesError } = await supabase
          .from("user_recipes")
          .select(`
            user_recipe_id,
            title,
            user_id,
            accepted_at,
            profiles!user_recipes_user_id_fkey (
              full_name
            )
          `)
          .eq("is_global", true)
          .eq("global_status", "accepted")
          .order("accepted_at", { ascending: false })
          .limit(20);

        if (recipesError) {
          console.error("Error fetching global recipes:", recipesError);
        } else {
          const transformedRecipes = (recipesData ?? []).map((recipe: any) => ({
            user_recipe_id: recipe.user_recipe_id,
            title: recipe.title,
            author_id: recipe.user_id,
            accepted_at: recipe.accepted_at,
            author_name: recipe.profiles?.full_name || null,
          }));
          setGlobalRecipes(transformedRecipes);
        }

        // Fetch user groups
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: groupsData, error: groupsError } = await supabase
            .from("group_members")
            .select(`
              groups:group_id (
                group_id,
                name,
                slug,
                category,
                description
              )
            `)
            .eq("profile_id", user.id);

          if (groupsError) {
            console.error("Error fetching user groups:", groupsError);
          } else {
            const transformedGroups = (groupsData ?? [])
              .map((row: any) => row.groups)
              .filter(Boolean);
            setMyGroups(transformedGroups);
          }
        }
      } catch (error) {
        console.error("Error fetching community data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <RouteGuard requireAuth={true}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-orange-900 mb-2">My Community</h1>
            <p className="text-orange-700">
              Global wins + your groups — all in one place.
            </p>
          </div>
          <div className="text-center py-8">
            <div className="text-orange-600">Loading community data...</div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-orange-900 mb-2">My Community</h1>
          <p className="text-orange-700">
            Global wins + your groups — all in one place.
          </p>
        </div>
        <CommunityLayoutsPreview
          globalRecipes={globalRecipes}
          myGroups={myGroups}
        />
      </div>
    </RouteGuard>
  );
}
