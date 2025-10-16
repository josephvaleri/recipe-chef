"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Users, 
  Crown, 
  UserMinus, 
  UserPlus, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  getGroupOwners, 
  isGroupOwner, 
  updateGroupVisibility, 
  addGroupOwner, 
  removeGroupOwner, 
  removeGroupMember,
  GroupOwner,
  GroupMember 
} from "@/lib/community/group-management";
import { toast } from "sonner";

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  currentIsPublic: boolean;
  onGroupUpdated: () => void;
}

export function GroupManagementModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  currentIsPublic,
  onGroupUpdated
}: GroupManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [owners, setOwners] = useState<GroupOwner[]>([]);
  const [isPublic, setIsPublic] = useState(currentIsPublic);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUserOwner, setIsUserOwner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) return;

      // Check if user is owner
      const userIsOwner = await isGroupOwner(groupId, user.id);
      setIsUserOwner(userIsOwner);

      if (!userIsOwner) {
        toast.error("You don't have permission to manage this group");
        onClose();
        return;
      }

      // Load group owners
      const groupOwners = await getGroupOwners(groupId);
      setOwners(groupOwners);

      // Load group members
      const { data: membersData, error: membersError } = await supabase
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

      if (membersError) {
        console.error("Error loading members:", membersError);
        toast.error("Failed to load group members");
        return;
      }

      const transformedMembers: GroupMember[] = (membersData || []).map((member: any) => ({
        profile_id: member.profile_id,
        full_name: member.profiles?.full_name,
        user_tag: member.profiles?.user_tag,
        avatar_url: member.profiles?.avatar_url,
        role: member.role,
        joined_at: member.joined_at,
        is_verified_chef: member.profiles?.is_verified_chef || false,
      }));

      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error loading group data:", error);
      toast.error("Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = async (newIsPublic: boolean) => {
    try {
      setLoading(true);
      await updateGroupVisibility(groupId, newIsPublic);
      setIsPublic(newIsPublic);
      toast.success(`Group is now ${newIsPublic ? 'public' : 'private'}`);
      onGroupUpdated();
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Failed to update group visibility");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      return;
    }

    try {
      setLoading(true);
      await removeGroupMember(groupId, memberId);
      setMembers(prev => prev.filter(m => m.profile_id !== memberId));
      toast.success(`${memberName} has been removed from the group`);
      onGroupUpdated();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToOwner = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to make ${memberName} a group owner?`)) {
      return;
    }

    try {
      setLoading(true);
      await addGroupOwner(groupId, memberId);
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.profile_id === memberId ? { ...m, role: 'owner' } : m
      ));
      
      // Reload owners list
      const groupOwners = await getGroupOwners(groupId);
      setOwners(groupOwners);
      
      toast.success(`${memberName} is now a group owner`);
      onGroupUpdated();
    } catch (error) {
      console.error("Error promoting member:", error);
      toast.error("Failed to promote member to owner");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteFromOwner = async (ownerId: string, ownerName: string) => {
    if (!confirm(`Are you sure you want to remove ${ownerName}'s owner privileges?`)) {
      return;
    }

    try {
      setLoading(true);
      await removeGroupOwner(groupId, ownerId);
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.profile_id === ownerId ? { ...m, role: 'member' } : m
      ));
      
      // Reload owners list
      const groupOwners = await getGroupOwners(groupId);
      setOwners(groupOwners);
      
      toast.success(`${ownerName} is no longer a group owner`);
      onGroupUpdated();
    } catch (error) {
      console.error("Error demoting owner:", error);
      toast.error("Failed to remove owner privileges");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4 text-yellow-600" />;
      case "mod": return <Users className="w-4 h-4 text-blue-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner": return <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>;
      case "mod": return <Badge className="bg-blue-100 text-blue-800">Moderator</Badge>;
      default: return <Badge variant="outline">Member</Badge>;
    }
  };

  if (!isUserOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage {groupName}
          </DialogTitle>
          <DialogDescription>
            Manage group settings, members, and ownership
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Group Visibility */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Group Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? "Anyone can find and join this group" 
                    : "Only members can see this group"
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                )}
                <Switch
                  checked={isPublic}
                  onCheckedChange={handleVisibilityChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Group Owners */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                Group Owners ({owners.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                Owners can manage the group and promote other members
              </p>
            </div>
            <div className="space-y-2">
              {owners.map((owner) => (
                <div
                  key={owner.owner_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
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
                      <div className="font-medium">{owner.owner_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Owner since {new Date(owner.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>
                    {owner.owner_id !== currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDemoteFromOwner(owner.owner_id, owner.owner_name)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Members */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="w-5 h-5" />
                Group Members ({members.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage member roles and remove members from the group
              </p>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.profile_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.full_name || "User"} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.full_name || member.user_tag || "Anonymous"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    <div className="flex gap-1">
                      {member.role !== 'owner' && member.profile_id !== currentUser?.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromoteToOwner(member.profile_id, member.full_name || "User")}
                            disabled={loading}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.profile_id, member.full_name || "User")}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
