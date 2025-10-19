"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Share2, 
  Users, 
  ChefHat, 
  Target, 
  User,
  Loader2,
  CheckCircle,
  Heart,
  UserPlus,
  Search,
  Mail
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useShareRecipe } from "@/lib/queries/community";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface Group {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
  member_count: number;
  is_member: boolean;
}

interface Friend {
  user_id: string;
  display_name: string;
  full_name: string;
  avatar_url?: string;
  is_visible: boolean;
}

interface ShareScope {
  type: 'FRIENDS' | 'FOLLOWERS' | 'BOTH' | 'SPECIFIC';
  recipients: string[];
}

interface ShareRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: number;
  recipeTitle: string;
  onRecipeShared?: () => void;
}

export function ShareRecipeModal({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  onRecipeShared
}: ShareRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  
  // Friends/Followers sharing state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [shareScope, setShareScope] = useState<ShareScope>({ type: 'FRIENDS', recipients: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  
  // Email sharing state
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  const { shareRecipe, loading: sharingRecipe } = useShareRecipe();

  useEffect(() => {
    if (isOpen) {
      loadUserGroups();
      getCurrentUser();
      loadFriendsAndFollowers();
    }
  }, [isOpen]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to share recipes");
        onClose();
        return;
      }

      // Get groups where the user is a member
      const { data: groupsData, error: groupsError } = await supabase
        .from("group_members")
        .select(`
          group_id,
          groups!group_members_group_id_fkey(
            group_id,
            name,
            slug,
            category,
            description,
            is_public
          )
        `)
        .eq("profile_id", user.id);

      if (groupsError) {
        console.error("Error loading user groups:", groupsError);
        toast.error("Failed to load your groups");
        return;
      }

      // Get member counts for each group
      const groupIds = groupsData?.map(g => g.groups.group_id) || [];
      let memberCounts: { [key: number]: number } = {};
      
      if (groupIds.length > 0) {
        const { data: countsData } = await supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groupIds);

        memberCounts = (countsData || []).reduce((acc, member) => {
          acc[member.group_id] = (acc[member.group_id] || 0) + 1;
          return acc;
        }, {} as { [key: number]: number });
      }

      // Transform the data
      const transformedGroups: Group[] = (groupsData || []).map((item: any) => ({
        group_id: item.groups.group_id,
        name: item.groups.name,
        slug: item.groups.slug,
        category: item.groups.category,
        description: item.groups.description,
        member_count: memberCounts[item.groups.group_id] || 0,
        is_member: true,
      }));

      setGroups(transformedGroups);
    } catch (error) {
      console.error("Error loading user groups:", error);
      toast.error("Failed to load your groups");
    } finally {
      setLoading(false);
    }
  };

  const loadFriendsAndFollowers = async () => {
    try {
      setLoadingFriends(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Load friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('user_friends')
        .select(`
          friend_id,
          profiles!user_friends_friend_id_fkey(
            user_id,
            display_name,
            full_name,
            avatar_url,
            visibility
          )
        `)
        .eq('user_id', user.id);

      if (friendsError) {
        console.error('Error loading friends:', friendsError);
      } else {
        const friendsList = (friendsData || []).map((item: any) => ({
          user_id: item.friend_id,
          display_name: item.profiles?.display_name || item.profiles?.full_name || 'Anonymous',
          full_name: item.profiles?.full_name || 'Anonymous',
          avatar_url: item.profiles?.avatar_url,
          is_visible: item.profiles?.visibility !== 'NO_VISIBILITY'
        }));
        setFriends(friendsList);
      }

      // Load followers
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select(`
          follower_id,
          profiles!user_follows_follower_id_fkey(
            user_id,
            display_name,
            full_name,
            avatar_url,
            visibility
          )
        `)
        .eq('followee_id', user.id);

      if (followersError) {
        console.error('Error loading followers:', followersError);
      } else {
        const followersList = (followersData || []).map((item: any) => ({
          user_id: item.follower_id,
          display_name: item.profiles?.display_name || item.profiles?.full_name || 'Anonymous',
          full_name: item.profiles?.full_name || 'Anonymous',
          avatar_url: item.profiles?.avatar_url,
          is_visible: item.profiles?.visibility !== 'NO_VISIBILITY'
        }));
        setFollowers(followersList);
      }
    } catch (error) {
      console.error('Error loading friends and followers:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleEmailShare = async () => {
    if (!emailRecipients.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }

    if (!emailSubject.trim()) {
      toast.error("Please enter a subject for your email");
      return;
    }

    try {
      setSendingEmail(true);

      const response = await fetch('/api/share/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeId,
          recipients: emailRecipients.split(',').map(email => email.trim()),
          subject: emailSubject,
          message: emailMessage,
          recipeTitle
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      toast.success(`Recipe sent to ${result.sentCount} recipient${result.sentCount > 1 ? 's' : ''}`);
      onRecipeShared?.();
      onClose();
      
      // Reset form
      setEmailRecipients('');
      setEmailSubject('');
      setEmailMessage('');
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send recipe via email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShare = async () => {
    if (activeTab === 'email') {
      await handleEmailShare();
      return;
    }
    
    if (activeTab === 'groups') {
      // Original group sharing logic
      if (selectedGroups.length === 0) {
        toast.error("Please select at least one group to share with");
        return;
      }

      if (!currentUser) {
        toast.error("You must be logged in to share recipes");
        return;
      }

      try {
        setSharing(true);

        // Share the recipe with each selected group
        const sharePromises = selectedGroups.map(groupId => 
          supabase
            .from("shared_recipes")
            .insert({
              group_id: groupId,
              recipe_id: recipeId,
              shared_by_id: currentUser.id,
              message: message.trim() || null,
              share_type: "group",
              recipients: []
            })
        );

        await Promise.all(sharePromises);

        toast.success(`Recipe shared with ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`);
        onRecipeShared?.();
        onClose();
        
        // Reset form
        setSelectedGroups([]);
        setMessage("");
      } catch (error) {
        console.error("Error sharing recipe:", error);
        toast.error("Failed to share recipe");
      } finally {
        setSharing(false);
      }
    } else {
      // Friends/Followers sharing logic
      if (shareScope.type === 'SPECIFIC' && shareScope.recipients.length === 0) {
        toast.error("Please select at least one person to share with");
        return;
      }

      try {
        setSharing(true);

        // Use the new share recipe hook
        await shareRecipe({
          recipeId,
          recipients: shareScope.type === 'SPECIFIC' ? shareScope.recipients : [],
          scope: shareScope.type === 'SPECIFIC' ? undefined : shareScope.type,
          note: message.trim() || undefined
        });

        const recipientCount = shareScope.type === 'SPECIFIC' 
          ? shareScope.recipients.length 
          : shareScope.type === 'BOTH' 
            ? friends.length + followers.length
            : shareScope.type === 'FRIENDS' 
              ? friends.length 
              : followers.length;

        toast.success(`Recipe shared with ${recipientCount} ${shareScope.type.toLowerCase()}`);
        onRecipeShared?.();
        onClose();
        
        // Reset form
        setShareScope({ type: 'FRIENDS', recipients: [] });
        setMessage("");
      } catch (error) {
        console.error("Error sharing recipe:", error);
        toast.error("Failed to share recipe");
      } finally {
        setSharing(false);
      }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Recipe
          </DialogTitle>
          <DialogDescription>
            Share "{recipeTitle}" with your community groups
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading your groups...</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Optional Message</Label>
            <Textarea
              id="message"
              placeholder="Add a message to go with your shared recipe..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tabs for Groups vs Friends/Followers vs Email */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="people">Friends & Followers</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="space-y-4">
              {/* Group Selection */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Select Groups</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose which groups to share this recipe with
                  </p>
                </div>

            {groups.length === 0 && !loading ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Groups Found</h3>
                <p className="text-muted-foreground mb-4">
                  You need to be a member of at least one group to share recipes.
                </p>
                <Button variant="outline" asChild>
                  <a href="/groups">Browse Groups</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.group_id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`group-${group.group_id}`}
                      checked={selectedGroups.includes(group.group_id)}
                      onCheckedChange={() => handleGroupToggle(group.group_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <label
                          htmlFor={`group-${group.group_id}`}
                          className="font-medium cursor-pointer"
                        >
                          {group.name}
                        </label>
                        <Badge 
                          variant="outline" 
                          className={`${getCategoryColor(group.category)} gap-1 text-xs`}
                        >
                          {getCategoryIcon(group.category)}
                          {group.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.member_count} members
                        </div>
                        {group.description && (
                          <div className="truncate">
                            {group.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
            </TabsContent>

            <TabsContent value="people" className="space-y-4">
              {/* Share Scope Selection */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Share With</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose who to share this recipe with
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={shareScope.type === 'FRIENDS' ? 'default' : 'outline'}
                    onClick={() => setShareScope({ type: 'FRIENDS', recipients: [] })}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Friends ({friends.length})
                  </Button>
                  <Button
                    variant={shareScope.type === 'FOLLOWERS' ? 'default' : 'outline'}
                    onClick={() => setShareScope({ type: 'FOLLOWERS', recipients: [] })}
                    className="flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    Followers ({followers.length})
                  </Button>
                  <Button
                    variant={shareScope.type === 'BOTH' ? 'default' : 'outline'}
                    onClick={() => setShareScope({ type: 'BOTH', recipients: [] })}
                    className="flex items-center gap-2 col-span-2"
                  >
                    <Users className="w-4 h-4" />
                    Both Friends & Followers ({friends.length + followers.length})
                  </Button>
                </div>

                {/* Specific People Selection */}
                {shareScope.type === 'SPECIFIC' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search friends and followers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {[...friends, ...followers]
                        .filter(person => 
                          person.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          person.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((person) => (
                          <div
                            key={person.user_id}
                            className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                          >
                            <Checkbox
                              id={`person-${person.user_id}`}
                              checked={shareScope.recipients.includes(person.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setShareScope(prev => ({
                                    ...prev,
                                    recipients: [...prev.recipients, person.user_id]
                                  }));
                                } else {
                                  setShareScope(prev => ({
                                    ...prev,
                                    recipients: prev.recipients.filter(id => id !== person.user_id)
                                  }));
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor={`person-${person.user_id}`}
                                  className="font-medium cursor-pointer truncate"
                                >
                                  {person.display_name}
                                </label>
                                {!person.is_visible && (
                                  <Badge variant="secondary" className="text-xs">
                                    Anonymous
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selection Summary */}
              {shareScope.type !== 'SPECIFIC' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">
                      Will share with {shareScope.type.toLowerCase()}
                    </span>
                  </div>
                </div>
              )}

              {shareScope.type === 'SPECIFIC' && shareScope.recipients.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">
                      {shareScope.recipients.length} person{shareScope.recipients.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Email Recipients</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter email addresses separated by commas
                  </p>
                  <Input
                    type="email"
                    placeholder="friend@example.com, family@example.com"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email-subject">Email Subject</Label>
                  <Input
                    id="email-subject"
                    placeholder={`Check out this recipe: ${recipeTitle}`}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email-message">Personal Message (Optional)</Label>
                  <Textarea
                    id="email-message"
                    placeholder="Add a personal message to go with the recipe..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">
                      The recipe will be sent as a PDF attachment from your account via Passionworksstudio.com
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={sharing}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={
              (activeTab === 'groups' && selectedGroups.length === 0) ||
              (activeTab === 'people' && shareScope.type === 'SPECIFIC' && shareScope.recipients.length === 0) ||
              (activeTab === 'email' && (!emailRecipients.trim() || !emailSubject.trim())) ||
              sharing || sendingEmail
            }
            className="bg-orange-600 hover:bg-orange-700"
          >
            {(sharing || sendingEmail) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {activeTab === 'email' ? 'Sending...' : 'Sharing...'}
              </>
            ) : (
              <>
                {activeTab === 'email' ? (
                  <Mail className="w-4 h-4 mr-2" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {activeTab === 'email' ? 'Send Recipe' : 'Share Recipe'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}