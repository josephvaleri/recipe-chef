"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Reply, 
  Hash, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Send,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  getGroupDiscussions, 
  getDiscussionReplies, 
  createReply,
  type Discussion as DBDiscussion,
  type DiscussionReply as DBReply 
} from "@/lib/community/discussions";

interface Discussion {
  id: number;
  title: string;
  content: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  reply_count: number;
  is_expanded?: boolean;
}

interface Reply {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
}

interface DiscussionsListProps {
  groupSlug: string;
  groupId: number;
  refreshTrigger?: number;
}

export function DiscussionsList({ groupSlug, groupId, refreshTrigger }: DiscussionsListProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, [groupId, refreshTrigger]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      
      // Load discussions from database
      const dbDiscussions = await getGroupDiscussions(groupId);
      
      // Transform to component format
      const transformedDiscussions: Discussion[] = dbDiscussions.map(db => ({
        id: db.discussion_id,
        title: db.title,
        content: db.content,
        tags: db.tags,
        author_id: db.author_id,
        author_name: db.author_name,
        author_avatar: db.author_avatar,
        created_at: db.created_at,
        reply_count: db.reply_count,
      }));

      setDiscussions(transformedDiscussions);

      // Load replies for expanded discussions
      const repliesMap: Record<number, Reply[]> = {};
      for (const discussion of transformedDiscussions) {
        if (expandedDiscussions.has(discussion.id)) {
          const dbReplies = await getDiscussionReplies(discussion.id);
          repliesMap[discussion.id] = dbReplies.map(db => ({
            id: db.reply_id,
            content: db.content,
            author_id: db.author_id,
            author_name: db.author_name,
            author_avatar: db.author_avatar,
            created_at: db.created_at,
          }));
        }
      }
      setReplies(repliesMap);
    } catch (error) {
      console.error("Error loading discussions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscussion = async (discussionId: number) => {
    const newExpanded = new Set(expandedDiscussions);
    if (newExpanded.has(discussionId)) {
      newExpanded.delete(discussionId);
      setExpandedDiscussions(newExpanded);
    } else {
      newExpanded.add(discussionId);
      setExpandedDiscussions(newExpanded);
      
      // Load replies for this discussion
      try {
        const dbReplies = await getDiscussionReplies(discussionId);
        const transformedReplies: Reply[] = dbReplies.map(db => ({
          id: db.reply_id,
          content: db.content,
          author_id: db.author_id,
          author_name: db.author_name,
          author_avatar: db.author_avatar,
          created_at: db.created_at,
        }));
        
        setReplies(prev => ({
          ...prev,
          [discussionId]: transformedReplies
        }));
      } catch (error) {
        console.error("Error loading replies:", error);
      }
    }
  };

  const handleReply = async (discussionId: number) => {
    if (!replyContent.trim()) return;

    try {
      setSubmittingReply(true);
      
      // Create reply in database
      const newReply = await createReply({
        discussion_id: discussionId,
        content: replyContent,
      });

      // Add to local state
      setReplies(prev => ({
        ...prev,
        [discussionId]: [...(prev[discussionId] || []), {
          id: newReply.reply_id,
          content: newReply.content,
          author_id: newReply.author_id,
          author_name: newReply.author_name,
          author_avatar: newReply.author_avatar,
          created_at: newReply.created_at,
        }]
      }));

      // Update reply count
      setDiscussions(prev => prev.map(d => 
        d.id === discussionId 
          ? { ...d, reply_count: d.reply_count + 1 }
          : d
      ));

      setReplyContent("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Discussions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-orange-600">Loading discussions...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Discussions ({discussions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {discussions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No discussions yet</h3>
            <p className="text-muted-foreground">
              Be the first to start a discussion in this group!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {discussions.map((discussion) => (
                <motion.div
                  key={discussion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-orange-100 rounded-lg overflow-hidden"
                >
                  {/* Discussion Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-orange-50 transition-colors"
                    onClick={() => toggleDiscussion(discussion.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-orange-900">
                            {discussion.title}
                          </h3>
                          {discussion.reply_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {discussion.reply_count} {discussion.reply_count === 1 ? 'reply' : 'replies'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-orange-700 text-sm mb-3">
                          {discussion.content}
                        </p>

                        {/* Tags */}
                        {discussion.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {discussion.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                                <Hash className="w-3 h-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Author and Date */}
                        <div className="flex items-center gap-4 text-xs text-orange-600">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                              {discussion.author_avatar ? (
                                <img 
                                  src={discussion.author_avatar} 
                                  alt={discussion.author_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span>{discussion.author_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(discussion.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {expandedDiscussions.has(discussion.id) ? (
                          <ChevronDown className="w-5 h-5 text-orange-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies Section */}
                  <AnimatePresence>
                    {expandedDiscussions.has(discussion.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-orange-100 bg-orange-25"
                      >
                        {/* Replies */}
                        {replies[discussion.id] && replies[discussion.id].length > 0 && (
                          <div className="p-4 space-y-3">
                            {replies[discussion.id].map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                                  {reply.author_avatar ? (
                                    <img 
                                      src={reply.author_avatar} 
                                      alt={reply.author_name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-orange-900">
                                      {reply.author_name}
                                    </span>
                                    <span className="text-xs text-orange-600">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-orange-700">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        <div className="p-4 border-t border-orange-100">
                          {replyingTo === discussion.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                rows={3}
                                className="resize-none"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleReply(discussion.id)}
                                  disabled={submittingReply || !replyContent.trim()}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  {submittingReply ? "Replying..." : "Reply"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyContent("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReplyingTo(discussion.id)}
                              className="w-full"
                            >
                              <Reply className="w-4 h-4 mr-2" />
                              Reply to discussion
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
