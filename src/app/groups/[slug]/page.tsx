"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isGroupOwner } from "@/lib/community/group-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  ChefHat, 
  Target, 
  User,
  ArrowLeft,
  Settings,
  Crown,
  Shield,
  Plus,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { DiscussionModal } from "@/components/community/DiscussionModal";
import { ShareRecipeModal } from "@/components/community/ShareRecipeModal";
import { PlanEventModal } from "@/components/community/PlanEventModal";
import { DiscussionsList } from "@/components/community/DiscussionsList";
import { SharedRecipesList } from "@/components/community/SharedRecipesList";
import { GroupManagementModal } from "@/components/community/GroupManagementModal";

type Group = {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
  is_public: boolean;
  owner_id: string | null;
  created_at: string;
  owner_display_name?: string;
  member_count: number;
  is_member: boolean;
  user_role?: "owner" | "mod" | "member";
};

type GroupMember = {
  profile_id: string;
  full_name: string | null;
  user_tag: string | null;
  avatar_url: string | null;
  role: "owner" | "mod" | "member";
  joined_at: string;
  is_verified_chef: boolean;
};

export default function GroupPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showShareRecipeModal, setShowShareRecipeModal] = useState(false);
  const [showPlanEventModal, setShowPlanEventModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [discussionsRefreshTrigger, setDiscussionsRefreshTrigger] = useState(0);
  const [sharedRecipesRefreshTrigger, setSharedRecipesRefreshTrigger] = useState(0);

  useEffect(() => {
    if (slug) {
      loadGroupData();
      getCurrentUser();
    }
  }, [slug]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const loadGroupData = async () => {
    try {
      setLoading(true);
      console.log("Loading group data for slug:", slug);
      const { data: { user } } = await supabase.auth.getUser();

      // Get group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          group_id,
          name,
          slug,
          category,
          description,
          is_public,
          owner_id,
          created_at,
          profiles!groups_owner_id_fkey(display_name)
        `)
        .eq("slug", slug)
        .single();

      if (groupError || !groupData) {
        console.error("Error fetching group:", groupError);
        console.log("Group data:", groupData);
        return;
      }

      console.log("Group data loaded:", groupData);

      // Get member count (including owners)
      const { count: memberCount } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupData.group_id);

      // Check if current user is a member and get their role
      let userMembership = null;
      let isOwner = false;
      if (user) {
        const { data: membershipData } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupData.group_id)
          .eq("profile_id", user.id)
          .single();
        userMembership = membershipData;
        
        // Check if user is a group owner
        try {
          isOwner = await isGroupOwner(groupData.group_id, user.id);
        } catch (error) {
          console.error("Error checking group ownership:", error);
          isOwner = false;
        }
      }

      // Get group members (excluding owners, we'll add them separately)
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          profile_id,
          role,
          joined_at
        `)
        .eq("group_id", groupData.group_id)
        .neq("role", "owner")
        .order("joined_at", { ascending: true });

      // Get group owners separately
      const { data: ownersData, error: ownersError } = await supabase
        .from("group_owners")
        .select(`
          owner_id,
          assigned_at
        `)
        .eq("group_id", groupData.group_id)
        .order("assigned_at", { ascending: true });

      if (membersError) {
        console.error("Error fetching members:", membersError);
      }

      // Get profile data for members and owners
      let memberProfiles: any[] = [];
      let ownerProfiles: any[] = [];
      
      // Get all profile IDs (members + owners)
      const memberIds = membersData?.map(m => m.profile_id) || [];
      const ownerIds = ownersData?.map(o => o.owner_id) || [];
      const allProfileIds = [...memberIds, ...ownerIds];
      
      if (allProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select(`
            user_id,
            full_name,
            user_tag,
            avatar_url,
            is_verified_chef
          `)
          .in("user_id", allProfileIds);

        // Combine member data with profile data
        if (membersData && membersData.length > 0) {
          memberProfiles = membersData.map(member => {
            const profile = profilesData?.find(p => p.user_id === member.profile_id);
            return {
              ...member,
              profiles: profile
            };
          });
        }

        // Combine owner data with profile data
        if (ownersData && ownersData.length > 0) {
          ownerProfiles = ownersData.map(owner => {
            const profile = profilesData?.find(p => p.user_id === owner.owner_id);
            return {
              profile_id: owner.owner_id,
              role: "owner",
              joined_at: owner.assigned_at,
              profiles: profile
            };
          });
        }
      }

      // Transform the data
      const transformedGroup: Group = {
        group_id: groupData.group_id,
        name: groupData.name,
        slug: groupData.slug,
        category: groupData.category,
        description: groupData.description,
        is_public: groupData.is_public,
        owner_id: groupData.owner_id,
        created_at: groupData.created_at,
        owner_display_name: groupData.profiles?.display_name || null,
        member_count: memberCount || 0,
        is_member: !!userMembership,
        user_role: isOwner ? "owner" : (userMembership?.role || undefined),
      };

      // Combine owners and members, with owners first, avoiding duplicates
      const allMembers = [...ownerProfiles, ...memberProfiles];
      
      // Remove duplicates based on profile_id, keeping the first occurrence (owners first)
      const uniqueMembers = allMembers.filter((member, index, self) => 
        index === self.findIndex(m => m.profile_id === member.profile_id)
      );
      
      const transformedMembers: GroupMember[] = uniqueMembers.map((member: any) => ({
        profile_id: member.profile_id,
        full_name: member.profiles?.full_name,
        user_tag: member.profiles?.user_tag,
        avatar_url: member.profiles?.avatar_url,
        role: member.role,
        joined_at: member.joined_at,
        is_verified_chef: member.profiles?.is_verified_chef || false,
      }));

      setGroup(transformedGroup);
      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error loading group data:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!currentUser || !group) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: group.group_id,
          profile_id: currentUser.id,
          role: "member",
        });

      if (error) {
        console.error("Error joining group:", error);
        return;
      }

      // Reload group data
      loadGroupData();
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const leaveGroup = async () => {
    if (!currentUser || !group) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.group_id)
        .eq("profile_id", currentUser.id);

      if (error) {
        console.error("Error leaving group:", error);
        return;
      }

      // Reload group data
      loadGroupData();
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cuisine": return <ChefHat className="w-4 h-4" />;
      case "focus": return <Target className="w-4 h-4" />;
      case "identity": return <User className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "cuisine": return "bg-orange-100 text-orange-800 border-orange-200";
      case "focus": return "bg-blue-100 text-blue-800 border-blue-200";
      case "identity": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4 text-yellow-600" />;
      case "mod": return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-orange-600">Loading group...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Group not found</h3>
              <p className="text-muted-foreground mb-4">
                The group you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/groups">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Groups
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/groups">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-orange-900">{group.name}</h1>
                <Badge 
                  variant="outline" 
                  className={`${getCategoryColor(group.category)} gap-1`}
                >
                  {getCategoryIcon(group.category)}
                  {group.category}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-orange-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.member_count} members
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {new Date(group.created_at).toLocaleDateString()}
                </div>
                {group.owner_name && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Owned by {group.owner_name}
                  </div>
                )}
              </div>
            </div>
            {(group.user_role === "owner" || group.user_role === "mod") && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowManagementModal(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            )}
          </div>

          {group.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-orange-700 leading-relaxed">{group.description}</p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Actions */}
        <div className="mb-8">
          <div className="flex gap-3">
            {group.is_member ? (
              <>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowDiscussionModal(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Start Discussion
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowShareRecipeModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Share Recipe
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowPlanEventModal(true)}
                >
                  <Calendar className="w-4 h-4" />
                  Plan Event
                </Button>
                <Button 
                  variant="outline" 
                  onClick={leaveGroup}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Leave Group
                </Button>
              </>
            ) : (
              <Button 
                onClick={joinGroup}
                className="bg-orange-600 hover:bg-orange-700 gap-2"
              >
                <Users className="w-4 h-4" />
                Join Group
              </Button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Discussions */}
          <div className="lg:col-span-2">
            <DiscussionsList 
              groupSlug={group.slug} 
              groupId={group.group_id}
              refreshTrigger={discussionsRefreshTrigger}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3 lg:col-start-3 space-y-6">
            {/* Shared Recipes */}
            <SharedRecipesList 
              groupSlug={group.slug} 
              groupId={group.group_id}
              refreshTrigger={sharedRecipesRefreshTrigger}
            />

            {/* Group Info */}
            <Card>
              <CardHeader>
                <CardTitle>Group Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-orange-900 mb-1">Category</div>
                  <Badge 
                    variant="outline" 
                    className={`${getCategoryColor(group.category)} gap-1`}
                  >
                    {getCategoryIcon(group.category)}
                    {group.category}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-900 mb-1">Visibility</div>
                  <div className="text-sm text-orange-600">
                    {group.is_public ? "Public" : "Private"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-900 mb-1">Created</div>
                  <div className="text-sm text-orange-600">
                    {new Date(group.created_at).toLocaleDateString()}
                  </div>
                </div>
                {group.owner_display_name && (
                  <div>
                    <div className="text-sm font-medium text-orange-900 mb-1">Group Owner</div>
                    <div className="text-sm text-orange-600">{group.owner_display_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowDiscussionModal(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Start Discussion
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowShareRecipeModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Share Recipe
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowPlanEventModal(true)}
                >
                  <Calendar className="w-4 h-4" />
                  Plan Event
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Members Section */}
        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Members */}
            <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Members ({group.member_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <motion.div
                      key={`${member.profile_id}-${member.role}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg border border-orange-100 hover:border-orange-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt={member.full_name || "User"} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-orange-900">
                              {member.full_name || member.user_tag || "Anonymous"}
                            </span>
                            {member.is_verified_chef && (
                              <Badge variant="outline" className="text-xs">
                                Verified Chef
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            {getRoleIcon(member.role)}
                            <span className="capitalize">{member.role}</span>
                            <span>•</span>
                            <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-muted-foreground">No recent activity</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>

        {/* Modals */}
        {group && (
          <>
            <DiscussionModal
              isOpen={showDiscussionModal}
              onClose={() => setShowDiscussionModal(false)}
              groupName={group.name}
              groupSlug={group.slug}
              onDiscussionCreated={() => setDiscussionsRefreshTrigger(prev => prev + 1)}
            />
            <ShareRecipeModal
              isOpen={showShareRecipeModal}
              onClose={() => setShowShareRecipeModal(false)}
              groupName={group.name}
              groupSlug={group.slug}
              onRecipeShared={() => setSharedRecipesRefreshTrigger(prev => prev + 1)}
            />
            <PlanEventModal
              isOpen={showPlanEventModal}
              onClose={() => setShowPlanEventModal(false)}
              groupName={group.name}
              groupSlug={group.slug}
            />
            <GroupManagementModal
              isOpen={showManagementModal}
              onClose={() => setShowManagementModal(false)}
              groupId={group.group_id}
              groupName={group.name}
              currentIsPublic={group.is_public}
              onGroupUpdated={() => {
                loadGroupData();
                setDiscussionsRefreshTrigger(prev => prev + 1);
                setSharedRecipesRefreshTrigger(prev => prev + 1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
