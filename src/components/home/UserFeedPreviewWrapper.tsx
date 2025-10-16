"use client";

// components/home/UserFeedPreviewWrapper.tsx
import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type GlobalRecipeItem = {
  user_recipe_id: number;
  title: string | null;
  accepted_at: string | null;
  author_name?: string | null;
};

export default function UserFeedPreviewWrapper() {
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalRecipes = async () => {
      try {
        const { data, error } = await supabase
          .from("user_recipes")
          .select(`
            user_recipe_id,
            title,
            accepted_at,
            profiles!user_recipes_user_id_fkey (
              full_name
            )
          `)
          .eq("is_global", true)
          .eq("global_status", "accepted")
          .order("accepted_at", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching global recipes:", error);
          return;
        }

        // Transform the data
        const transformedData = (data ?? []).map((recipe: any) => ({
          user_recipe_id: recipe.user_recipe_id,
          title: recipe.title,
          accepted_at: recipe.accepted_at,
          author_name: recipe.profiles?.full_name || null,
        }));

        setGlobalRecipes(transformedData);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalRecipes();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Community Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading community feed...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-600" />
          Community Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {globalRecipes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent community activity yet.
          </div>
        ) : (
          <>
            {globalRecipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.user_recipe_id}
                className="flex items-center justify-between p-2 rounded-lg border border-orange-100 hover:border-orange-200 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-orange-900">
                    {recipe.title ?? "Untitled recipe"}
                  </div>
                  <div className="text-xs text-orange-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {recipe.accepted_at ? new Date(recipe.accepted_at).toLocaleDateString() : "Recently"}
                    {recipe.author_name && (
                      <>
                        <span>•</span>
                        <span>by {recipe.author_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/recipe/${recipe.user_recipe_id}`}>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
            
            {globalRecipes.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                +{globalRecipes.length - 3} more recent additions
              </div>
            )}
          </>
        )}
        
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/community" className="flex items-center gap-2">
              View Full Community Feed
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
