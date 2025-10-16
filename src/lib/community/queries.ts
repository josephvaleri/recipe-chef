// lib/community/queries.ts
import { createClient } from '@supabase/supabase-js'

export type GlobalRecipeItem = {
  user_recipe_id: number;
  title: string | null;
  author_id: string | null;
  accepted_at: string | null;
  author_name?: string | null;
};

export type GroupCard = {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
  member_count?: number;
};

export type UserProfile = {
  user_id: string;
  full_name: string | null;
  user_tag: string | null;
  avatar_url: string | null;
  is_verified_chef: boolean;
  house_specialties: number[] | null;
};

/**
 * Get global recipes that have been accepted into the global cookbook
 */
export async function getGlobalAcceptedRecipes(limit = 20): Promise<GlobalRecipeItem[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data, error } = await supabase
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
    .limit(limit);

  if (error) {
    console.error("getGlobalAcceptedRecipes error", error);
    return [];
  }

  // Transform the data to include author name
  return (data ?? []).map((recipe: any) => ({
    user_recipe_id: recipe.user_recipe_id,
    title: recipe.title,
    author_id: recipe.user_id,
    accepted_at: recipe.accepted_at,
    author_name: recipe.profiles?.full_name || null,
  }));
}

/**
 * Get groups that the current user is a member of
 */
export async function getMyGroups(): Promise<GroupCard[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  
  if (authErr || !user) return [];

  const { data, error } = await supabase
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

  if (error) {
    console.error("getMyGroups error", error);
    return [];
  }

  // Flatten the nested structure
  return (data ?? [])
    .map((row: any) => row.groups)
    .filter(Boolean);
}

/**
 * Get all public groups for discovery
 */
export async function getAllPublicGroups(limit = 50): Promise<GroupCard[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("groups")
    .select(`
      group_id,
      name,
      slug,
      category,
      description
    `)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAllPublicGroups error", error);
    return [];
  }

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    (data ?? []).map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.group_id);
      
      return {
        ...group,
        member_count: count || 0,
      };
    })
  );

  return groupsWithCounts;
}

/**
 * Get groups by category
 */
export async function getGroupsByCategory(
  category: "cuisine" | "focus" | "identity",
  limit = 20
): Promise<GroupCard[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("groups")
    .select(`
      group_id,
      name,
      slug,
      category,
      description
    `)
    .eq("category", category)
    .eq("is_public", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getGroupsByCategory error", error);
    return [];
  }

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    (data ?? []).map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.group_id);
      
      return {
        ...group,
        member_count: count || 0,
      };
    })
  );

  return groupsWithCounts;
}

/**
 * Join a group
 */
export async function joinGroup(groupId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  
  if (authErr || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      profile_id: user.id,
      role: "member",
    });

  if (error) {
    console.error("joinGroup error", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  
  if (authErr || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("leaveGroup error", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get user profile with community fields
 */
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  
  if (authErr || !user) return null;

  const targetUserId = userId || user.id;

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      user_tag,
      avatar_url,
      is_verified_chef,
      house_specialties
    `)
    .eq("user_id", targetUserId)
    .single();

  if (error) {
    console.error("getUserProfile error", error);
    return null;
  }

  return data;
}
