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
  CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Group {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
  member_count: number;
  is_member: boolean;
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

  useEffect(() => {
    if (isOpen) {
      loadUserGroups();
      getCurrentUser();
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

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleShare = async () => {
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

          {/* Selection Summary */}
          {selectedGroups.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">
                  {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={sharing}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={selectedGroups.length === 0 || sharing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share Recipe
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}