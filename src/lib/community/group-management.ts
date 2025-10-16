import { supabase } from "@/lib/supabase";

export interface GroupOwner {
  group_id: number;
  owner_id: string;
  assigned_by: string | null;
  assigned_at: string;
  // Joined data
  owner_name: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
}

export interface GroupMember {
  profile_id: string;
  role: string;
  joined_at: string;
  // Joined data
  full_name: string;
  user_tag: string | null;
  avatar_url: string | null;
  is_verified_chef: boolean;
}

// Get group owners
export async function getGroupOwners(groupId: number): Promise<GroupOwner[]> {
  const { data, error } = await supabase
    .from("group_owners")
    .select(`
      group_id,
      owner_id,
      assigned_by,
      assigned_at,
      profiles!group_owners_owner_id_fkey(
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .order("assigned_at", { ascending: true });

  if (error) {
    console.error("Error fetching group owners:", error);
    throw error;
  }

  return (data || []).map((owner: any) => ({
    group_id: owner.group_id,
    owner_id: owner.owner_id,
    assigned_by: owner.assigned_by,
    assigned_at: owner.assigned_at,
    owner_name: owner.profiles?.full_name || "Unknown User",
    owner_display_name: owner.profiles?.display_name || null,
    owner_avatar_url: owner.profiles?.avatar_url || null,
  }));
}

// Check if user is a group owner
export async function isGroupOwner(groupId: number, userId: string): Promise<boolean> {
  // First check the new group_owners table
  const { data: ownerData, error: ownerError } = await supabase
    .from("group_owners")
    .select("owner_id")
    .eq("group_id", groupId)
    .eq("owner_id", userId)
    .single();

  if (ownerError && ownerError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error("Error checking group ownership:", ownerError);
    throw ownerError;
  }

  if (ownerData) {
    return true;
  }

  // Fallback: check the old groups.owner_id field
  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("group_id", groupId)
    .single();

  if (groupError) {
    console.error("Error checking group owner_id:", groupError);
    return false;
  }

  return groupData?.owner_id === userId;
}

// Update group visibility
export async function updateGroupVisibility(groupId: number, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({ is_public: isPublic })
    .eq("group_id", groupId);

  if (error) {
    console.error("Error updating group visibility:", error);
    throw error;
  }
}

// Add user as group owner
export async function addGroupOwner(groupId: number, userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // First, make sure they're a member of the group
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      profile_id: userId,
      role: "owner"
    })
    .onConflict(["group_id", "profile_id"])
    .merge({ role: "owner" });

  if (memberError) {
    console.error("Error adding user as group member:", memberError);
    throw memberError;
  }

  // Then add them as an owner
  const { error: ownerError } = await supabase
    .from("group_owners")
    .insert({
      group_id: groupId,
      owner_id: userId,
      assigned_by: user.id
    })
    .onConflict(["group_id", "owner_id"])
    .doNothing();

  if (ownerError) {
    console.error("Error adding group owner:", ownerError);
    throw ownerError;
  }
}

// Remove user as group owner
export async function removeGroupOwner(groupId: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_owners")
    .delete()
    .eq("group_id", groupId)
    .eq("owner_id", userId);

  if (error) {
    console.error("Error removing group owner:", error);
    throw error;
  }

  // Update their role back to member
  const { error: memberError } = await supabase
    .from("group_members")
    .update({ role: "member" })
    .eq("group_id", groupId)
    .eq("profile_id", userId);

  if (memberError) {
    console.error("Error updating member role:", memberError);
    throw memberError;
  }
}

// Remove member from group
export async function removeGroupMember(groupId: number, userId: string): Promise<void> {
  // Remove from group_members
  const { error: memberError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", userId);

  if (memberError) {
    console.error("Error removing group member:", memberError);
    throw memberError;
  }

  // Also remove from group_owners if they were an owner
  const { error: ownerError } = await supabase
    .from("group_owners")
    .delete()
    .eq("group_id", groupId)
    .eq("owner_id", userId);

  if (ownerError) {
    console.error("Error removing group owner:", ownerError);
    throw ownerError;
  }
}
