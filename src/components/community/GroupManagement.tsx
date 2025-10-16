"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Users, 
  Crown, 
  Trash2, 
  Shield,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getGroupOwners, 
  isGroupOwner, 
  updateGroupVisibility,
  addGroupOwner,
  removeGroupOwner,
  removeGroupMember,
  type GroupOwner,
  type GroupMember 
} from "@/lib/community/group-management";
import { supabase } from "@/lib/supabase";

interface GroupManagementProps {
  groupId: number;
  groupSlug: string;
  isPublic: boolean;
  currentUserId: string;
  onUpdate?: () => void;
}

export function GroupManagement({ 
  groupId, 
  groupSlug, 
  isPublic, 
  currentUserId,
  onUpdate 
}: GroupManagementProps) {
  const [owners, setOwners] = useState<GroupOwner[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadGroupData();
  }, [groupId, currentUserId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      
      // Check if current user is an owner
      const userIsOwner = await isGroupOwner(groupId, currentUserId);
      setIsOwner(userIsOwner);

      if (userIsOwner) {
        // Load owners and members
        const [ownersData, membersData] = await Promise.all([
          getGroupOwners(groupId),
          loadGroupMembers()
        ]);
        
        setOwners(ownersData);
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Error loading group data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        profile_id,
        role,
        joined_at,
        profiles!group_members_profile_id_fkey(
          full_name,
          user_tag,
          avatar_url,
          is_verified_chef
        )
      `)
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error loading group members:", error);
      return [];
    }

    return (data || []).map((member: any) => ({
      profile_id: member.profile_id,
      role: member.role,
      joined_at: member.joined_at,
      full_name: member.profiles?.full_name || "Unknown User",
      user_tag: member.profiles?.user_tag || null,
      avatar_url: member.profiles?.avatar_url || null,
      is_verified_chef: member.profiles?.is_verified_chef || false,
    }));
  };

  const handleToggleVisibility = async () => {
    try {
      setActionLoading("visibility");
      await updateGroupVisibility(groupId, !isPublic);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating visibility:", error);
      alert("Failed to update group visibility");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromoteToOwner = async (userId: string) => {
    try {
      setActionLoading(`promote-${userId}`);
      await addGroupOwner(groupId, userId);
      await loadGroupData();
      onUpdate?.();
    } catch (error) {
      console.error("Error promoting user:", error);
      alert("Failed to promote user to owner");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveOwner = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this owner?")) return;
    
    try {
      setActionLoading(`remove-owner-${userId}`);
      await removeGroupOwner(groupId, userId);
      await loadGroupData();
      onUpdate?.();
    } catch (error) {
      console.error("Error removing owner:", error);
      alert("Failed to remove owner");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the group?")) return;
    
    try {
      setActionLoading(`remove-member-${userId}`);
      await removeGroupMember(groupId, userId);
      await loadGroupData();
      onUpdate?.();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Group Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-orange-600">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return null; // Don't show management panel if user is not an owner
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Group Management
        </CardTitle>
        <CardDescription>
          Owner controls for managing this group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-orange-900">Group Visibility</h3>
              <p className="text-sm text-orange-600">
                {isPublic ? "Public - Anyone can see and join" : "Private - Only members can see"}
              </p>
            </div>
            <Button
              onClick={handleToggleVisibility}
              disabled={actionLoading === "visibility"}
              variant="outline"
              className="gap-2"
            >
              {isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {actionLoading === "visibility" ? "Updating..." : isPublic ? "Make Private" : "Make Public"}
            </Button>
          </div>
        </div>

        {/* Group Owners */}
        <div className="space-y-3">
          <h3 className="font-medium text-orange-900 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Group Owners ({owners.length})
          </h3>
          <div className="space-y-2">
            {owners.map((owner) => (
              <div key={owner.owner_id} className="flex items-center justify-between p-3 rounded-lg border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    {owner.owner_avatar_url ? (
                      <img 
                        src={owner.owner_avatar_url} 
                        alt={owner.owner_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <Crown className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-orange-900">
                      {owner.owner_display_name || owner.owner_name}
                    </div>
                    <div className="text-xs text-orange-600">
                      Owner since {new Date(owner.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {owner.owner_id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveOwner(owner.owner_id)}
                    disabled={actionLoading === `remove-owner-${owner.owner_id}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Group Members */}
        <div className="space-y-3">
          <h3 className="font-medium text-orange-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Group Members ({members.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((member) => {
              const isAlreadyOwner = owners.some(o => o.owner_id === member.profile_id);
              
              return (
                <div key={member.profile_id} className="flex items-center justify-between p-3 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-orange-900">{member.full_name}</div>
                      <div className="text-xs text-orange-600 flex items-center gap-2">
                        {member.user_tag && <span>@{member.user_tag}</span>}
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isAlreadyOwner && member.profile_id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromoteToOwner(member.profile_id)}
                        disabled={actionLoading === `promote-${member.profile_id}`}
                        className="gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Promote
                      </Button>
                    )}
                    {member.profile_id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMember(member.profile_id)}
                        disabled={actionLoading === `remove-member-${member.profile_id}`}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
