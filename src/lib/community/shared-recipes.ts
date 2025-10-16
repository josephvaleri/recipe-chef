import { supabase } from "@/lib/supabase";

export interface SharedRecipe {
  shared_recipe_id: number;
  group_id: number;
  recipe_id: number;
  shared_by_id: string;
  message: string | null;
  share_type: "group" | "specific";
  recipients: string[];
  shared_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  recipe_title: string;
  recipe_total_time: string | null;
  recipe_servings: string | null;
  recipe_image_url: string | null;
  shared_by_name: string;
  shared_by_handle: string | null;
  shared_by_avatar_url: string | null;
}

export interface CreateSharedRecipeData {
  group_id: number;
  recipe_id: number;
  message?: string;
  share_type: "group" | "specific";
  recipients?: string[];
}

// Get shared recipes for a group
export async function getGroupSharedRecipes(groupId: number): Promise<SharedRecipe[]> {
  const { data, error } = await supabase
    .from("shared_recipes")
    .select(`
      shared_recipe_id,
      group_id,
      recipe_id,
      shared_by_id,
      message,
      share_type,
      recipients,
      shared_at,
      created_at,
      updated_at,
      user_recipes!shared_recipes_recipe_id_fkey(
        title,
        total_time,
        servings,
        image_url
      ),
      profiles!shared_recipes_shared_by_id_fkey(
        full_name,
        user_tag,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .order("shared_at", { ascending: false });

  if (error) {
    console.error("Error fetching shared recipes:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    shared_recipe_id: item.shared_recipe_id,
    group_id: item.group_id,
    recipe_id: item.recipe_id,
    shared_by_id: item.shared_by_id,
    message: item.message,
    share_type: item.share_type,
    recipients: item.recipients || [],
    shared_at: item.shared_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    recipe_title: item.user_recipes?.title || "Unknown Recipe",
    recipe_total_time: item.user_recipes?.total_time || null,
    recipe_servings: item.user_recipes?.servings || null,
    recipe_image_url: item.user_recipes?.image_url || null,
    shared_by_name: item.profiles?.full_name || "Unknown User",
    shared_by_handle: item.profiles?.user_tag || null,
    shared_by_avatar_url: item.profiles?.avatar_url || null,
  }));
}

// Create a new shared recipe
export async function createSharedRecipe(data: CreateSharedRecipeData): Promise<SharedRecipe> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: sharedRecipe, error } = await supabase
    .from("shared_recipes")
    .insert({
      group_id: data.group_id,
      recipe_id: data.recipe_id,
      shared_by_id: user.id,
      message: data.message || null,
      share_type: data.share_type,
      recipients: data.recipients || [],
    })
    .select(`
      shared_recipe_id,
      group_id,
      recipe_id,
      shared_by_id,
      message,
      share_type,
      recipients,
      shared_at,
      created_at,
      updated_at,
      user_recipes!shared_recipes_recipe_id_fkey(
        title,
        total_time,
        servings,
        image_url
      ),
      profiles!shared_recipes_shared_by_id_fkey(
        full_name,
        user_tag,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error("Error creating shared recipe:", error);
    throw error;
  }

  return {
    shared_recipe_id: sharedRecipe.shared_recipe_id,
    group_id: sharedRecipe.group_id,
    recipe_id: sharedRecipe.recipe_id,
    shared_by_id: sharedRecipe.shared_by_id,
    message: sharedRecipe.message,
    share_type: sharedRecipe.share_type,
    recipients: sharedRecipe.recipients || [],
    shared_at: sharedRecipe.shared_at,
    created_at: sharedRecipe.created_at,
    updated_at: sharedRecipe.updated_at,
    recipe_title: sharedRecipe.user_recipes?.title || "Unknown Recipe",
    recipe_total_time: sharedRecipe.user_recipes?.total_time || null,
    recipe_servings: sharedRecipe.user_recipes?.servings || null,
    recipe_image_url: sharedRecipe.user_recipes?.image_url || null,
    shared_by_name: sharedRecipe.profiles?.full_name || "You",
    shared_by_handle: sharedRecipe.profiles?.user_tag || null,
    shared_by_avatar_url: sharedRecipe.profiles?.avatar_url || null,
  };
}

// Delete a shared recipe
export async function deleteSharedRecipe(sharedRecipeId: number): Promise<void> {
  const { error } = await supabase
    .from("shared_recipes")
    .delete()
    .eq("shared_recipe_id", sharedRecipeId);

  if (error) {
    console.error("Error deleting shared recipe:", error);
    throw error;
  }
}
