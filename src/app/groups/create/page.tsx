"use client";

import React, { useState } from "react";
import { RouteGuard } from "@/components/route-guard";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  Users,
  ChefHat,
  Target,
  User,
  Hash,
  Globe,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type GroupCategory = "cuisine" | "focus" | "identity";

export default function CreateGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "cuisine" as GroupCategory,
    is_public: true,
  });

  const categories = [
    {
      value: "cuisine" as GroupCategory,
      label: "Cuisine",
      description: "Regional and cultural cooking traditions",
      icon: <ChefHat className="w-5 h-5" />,
    },
    {
      value: "focus" as GroupCategory,
      label: "Focus",
      description: "Specific cooking techniques or styles",
      icon: <Target className="w-5 h-5" />,
    },
    {
      value: "identity" as GroupCategory,
      label: "Identity",
      description: "Professional roles or personal interests",
      icon: <User className="w-5 h-5" />,
    },
  ];

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const slug = generateSlug(formData.name);

      // Check if slug already exists
      const { data: existingGroup } = await supabase
        .from("groups")
        .select("slug")
        .eq("slug", slug)
        .single();

      if (existingGroup) {
        alert("A group with this name already exists. Please choose a different name.");
        setLoading(false);
        return;
      }

      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: formData.name,
          slug: slug,
          description: formData.description || null,
          category: formData.category,
          is_public: formData.is_public,
          owner_id: user.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error("Error creating group:", groupError);
        alert("Failed to create group. Please try again.");
        setLoading(false);
        return;
      }

      // Add the creator as the owner
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.group_id,
          profile_id: user.id,
          role: "owner",
        });

      if (memberError) {
        console.error("Error adding owner to group:", memberError);
        // Group was created but owner wasn't added - this is still a success
      }

      // Redirect to the new group
      router.push(`/groups/${slug}`);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cuisine": return <ChefHat className="w-4 h-4" />;
      case "focus": return <Target className="w-4 h-4" />;
      case "identity": return <User className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/groups">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900 mb-2">Create New Group</h1>
              <p className="text-orange-700">
                Start a community of like-minded cooks and food enthusiasts.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
            <CardDescription>
              Fill out the information below to create your new group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Group Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Italian Cooking Enthusiasts"
                  required
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  Choose a descriptive name that represents your group's focus.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe what your group is about, what members can expect, and any guidelines..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Category */}
              <div className="space-y-3">
                <Label>Category</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <motion.div
                      key={category.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <label className="block">
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={formData.category === category.value}
                          onChange={(e) => handleInputChange("category", e.target.value)}
                          className="sr-only"
                        />
                        <Card className={`cursor-pointer transition-all ${
                          formData.category === category.value
                            ? "ring-2 ring-orange-500 border-orange-200"
                            : "hover:border-orange-200"
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-lg ${
                                formData.category === category.value
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {category.icon}
                              </div>
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {category.description}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </label>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-3">
                <Label>Visibility</Label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={formData.is_public}
                      onChange={() => handleInputChange("is_public", true)}
                      className="sr-only"
                    />
                    <Card className={`flex-1 transition-all ${
                      formData.is_public
                        ? "ring-2 ring-orange-500 border-orange-200"
                        : "hover:border-orange-200"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            formData.is_public
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-sm text-muted-foreground">
                              Anyone can discover and join this group
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={!formData.is_public}
                      onChange={() => handleInputChange("is_public", false)}
                      className="sr-only"
                    />
                    <Card className={`flex-1 transition-all ${
                      !formData.is_public
                        ? "ring-2 ring-orange-500 border-orange-200"
                        : "hover:border-orange-200"
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            !formData.is_public
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">Private</div>
                            <div className="text-sm text-muted-foreground">
                              Only invited members can join this group
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? "Creating..." : "Create Group"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                >
                  <Link href="/groups">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        {formData.name && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>This is how your group will appear to others.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                  {getCategoryIcon(formData.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-orange-900">{formData.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-orange-600">
                      {formData.is_public ? (
                        <>
                          <Globe className="w-4 h-4" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Private
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="gap-1">
                      {getCategoryIcon(formData.category)}
                      {categories.find(c => c.value === formData.category)?.label}
                    </Badge>
                  </div>
                  {formData.description && (
                    <p className="text-orange-700">{formData.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-orange-600 mt-3">
                    <Users className="w-4 h-4" />
                    1 member (you)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  );
}
