"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Users, 
  Plus, 
  Hash, 
  ChefHat, 
  Target, 
  User,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type GroupCard = {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
  member_count: number;
  is_member: boolean;
  owner_id: string | null;
  created_at: string;
};

type CategoryFilter = "all" | "cuisine" | "focus" | "identity";

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadGroups();
    getCurrentUser();
  }, []);

  useEffect(() => {
    loadGroups();
  }, [categoryFilter]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all public groups with member counts
      let query = supabase
        .from("groups")
        .select(`
          group_id,
          name,
          slug,
          category,
          description,
          owner_id,
          created_at,
          group_members!left(count)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data: groupsData, error: groupsError } = await query;

      if (groupsError) {
        console.error("Error fetching groups:", groupsError);
        return;
      }

      // Get user's group memberships
      let memberships: any[] = [];
      if (user) {
        const { data: membershipData } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("profile_id", user.id);
        memberships = membershipData || [];
      }

      // Transform the data
      const transformedGroups = (groupsData || []).map((group: any) => ({
        group_id: group.group_id,
        name: group.name,
        slug: group.slug,
        category: group.category,
        description: group.description,
        member_count: group.group_members?.[0]?.count || 0,
        is_member: memberships.some(m => m.group_id === group.group_id),
        owner_id: group.owner_id,
        created_at: group.created_at,
      }));

      setGroups(transformedGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: number) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          profile_id: currentUser.id,
          role: "member",
        });

      if (error) {
        console.error("Error joining group:", error);
        return;
      }

      // Update local state
      setGroups(prev => prev.map(group => 
        group.group_id === groupId 
          ? { ...group, is_member: true, member_count: group.member_count + 1 }
          : group
      ));
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const leaveGroup = async (groupId: number) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("profile_id", currentUser.id);

      if (error) {
        console.error("Error leaving group:", error);
        return;
      }

      // Update local state
      setGroups(prev => prev.map(group => 
        group.group_id === groupId 
          ? { ...group, is_member: false, member_count: Math.max(0, group.member_count - 1) }
          : group
      ));
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cuisine": return <ChefHat className="w-4 h-4" />;
      case "focus": return <Target className="w-4 h-4" />;
      case "identity": return <User className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
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

  if (loading) {
    return (
      <div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-orange-600">Loading groups...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-orange-900 mb-2">Discover Groups</h1>
              <p className="text-orange-700">
                Join communities of like-minded cooks and food enthusiasts.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/groups/create">
                <Plus className="w-4 h-4" />
                Create Group
              </Link>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
              >
                All
              </Button>
              <Button
                variant={categoryFilter === "cuisine" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("cuisine")}
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Cuisine
              </Button>
              <Button
                variant={categoryFilter === "focus" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("focus")}
              >
                <Target className="w-4 h-4 mr-2" />
                Focus
              </Button>
              <Button
                variant={categoryFilter === "identity" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("identity")}
              >
                <User className="w-4 h-4 mr-2" />
                Identity
              </Button>
            </div>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Groups Grid/List */}
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No groups found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search terms." : "No groups match your current filter."}
              </p>
              <Button asChild>
                <Link href="/groups/create">Create the first group</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            <AnimatePresence>
              {filteredGroups.map((group) => (
                <motion.div
                  key={group.group_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{group.name}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={`${getCategoryColor(group.category)} gap-1`}
                          >
                            {getCategoryIcon(group.category)}
                            {group.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {group.member_count}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && (
                        <CardDescription className="mb-4">
                          {group.description}
                        </CardDescription>
                      )}
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/groups/${group.slug}`}>
                            View Group
                          </Link>
                        </Button>
                        {group.is_member ? (
                          <Button 
                            variant="outline" 
                            onClick={() => leaveGroup(group.group_id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Leave
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => joinGroup(group.group_id)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
