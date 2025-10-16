"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, MessageSquare, Hash, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createDiscussion } from "@/lib/community/discussions";
import { supabase } from "@/lib/supabase";

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupSlug: string;
  onDiscussionCreated?: () => void;
}

export function DiscussionModal({ isOpen, onClose, groupName, groupSlug, onDiscussionCreated }: DiscussionModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      // Get group ID from slug
      const { data: groupData } = await supabase
        .from("groups")
        .select("group_id")
        .eq("slug", groupSlug)
        .single();

      if (!groupData) {
        throw new Error("Group not found");
      }

      // Create discussion in database
      await createDiscussion({
        group_id: groupData.group_id,
        title,
        content,
        tags,
      });
      
      // Reset form and close modal
      setTitle("");
      setContent("");
      setTags([]);
      onClose();
      
      // Notify parent to refresh discussions
      onDiscussionCreated?.();
    } catch (error) {
      console.error("Error creating discussion:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  Start Discussion
                </CardTitle>
                <CardDescription>
                  Create a new discussion in {groupName}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Discussion Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What would you like to discuss?"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Discussion Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your thoughts, questions, or ideas with the group..."
                    rows={6}
                    required
                    maxLength={2000}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {content.length}/2000 characters
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Tags (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add a tag (press Enter)"
                      className="flex-1"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Hash className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !title.trim() || !content.trim()}
                    className="bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? "Creating..." : "Start Discussion"}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
