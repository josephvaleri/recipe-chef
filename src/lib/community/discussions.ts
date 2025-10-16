import { supabase } from "@/lib/supabase";

export interface Discussion {
  discussion_id: number;
  group_id: number;
  title: string;
  content: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

export interface DiscussionReply {
  reply_id: number;
  discussion_id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscussionData {
  group_id: number;
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateReplyData {
  discussion_id: number;
  content: string;
}

// Get discussions for a group
export async function getGroupDiscussions(groupId: number): Promise<Discussion[]> {
  const { data, error } = await supabase
    .from("discussions")
    .select(`
      discussion_id,
      group_id,
      title,
      content,
      tags,
      author_id,
      created_at,
      updated_at,
      profiles!discussions_author_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching discussions:", error);
    throw error;
  }

  // Get reply counts for each discussion
  const discussionsWithCounts = await Promise.all(
    (data || []).map(async (discussion: any) => {
      const { count } = await supabase
        .from("discussion_replies")
        .select("*", { count: "exact", head: true })
        .eq("discussion_id", discussion.discussion_id);

      return {
        discussion_id: discussion.discussion_id,
        group_id: discussion.group_id,
        title: discussion.title,
        content: discussion.content,
        tags: discussion.tags || [],
        author_id: discussion.author_id,
        author_name: discussion.profiles?.full_name || "Unknown User",
        author_avatar: discussion.profiles?.avatar_url || null,
        created_at: discussion.created_at,
        updated_at: discussion.updated_at,
        reply_count: count || 0,
      };
    })
  );

  return discussionsWithCounts;
}

// Get replies for a discussion
export async function getDiscussionReplies(discussionId: number): Promise<DiscussionReply[]> {
  const { data, error } = await supabase
    .from("discussion_replies")
    .select(`
      reply_id,
      discussion_id,
      content,
      author_id,
      created_at,
      updated_at,
      profiles!discussion_replies_author_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching replies:", error);
    throw error;
  }

  return (data || []).map((reply: any) => ({
    reply_id: reply.reply_id,
    discussion_id: reply.discussion_id,
    content: reply.content,
    author_id: reply.author_id,
    author_name: reply.profiles?.full_name || "Unknown User",
    author_avatar: reply.profiles?.avatar_url || null,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
  }));
}

// Create a new discussion
export async function createDiscussion(data: CreateDiscussionData): Promise<Discussion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: discussion, error } = await supabase
    .from("discussions")
    .insert({
      group_id: data.group_id,
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      author_id: user.id,
    })
    .select(`
      discussion_id,
      group_id,
      title,
      content,
      tags,
      author_id,
      created_at,
      updated_at,
      profiles!discussions_author_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error("Error creating discussion:", error);
    throw error;
  }

  return {
    discussion_id: discussion.discussion_id,
    group_id: discussion.group_id,
    title: discussion.title,
    content: discussion.content,
    tags: discussion.tags || [],
    author_id: discussion.author_id,
    author_name: discussion.profiles?.full_name || "You",
    author_avatar: discussion.profiles?.avatar_url || null,
    created_at: discussion.created_at,
    updated_at: discussion.updated_at,
    reply_count: 0,
  };
}

// Create a new reply
export async function createReply(data: CreateReplyData): Promise<DiscussionReply> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: reply, error } = await supabase
    .from("discussion_replies")
    .insert({
      discussion_id: data.discussion_id,
      content: data.content,
      author_id: user.id,
    })
    .select(`
      reply_id,
      discussion_id,
      content,
      author_id,
      created_at,
      updated_at,
      profiles!discussion_replies_author_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error("Error creating reply:", error);
    throw error;
  }

  return {
    reply_id: reply.reply_id,
    discussion_id: reply.discussion_id,
    content: reply.content,
    author_id: reply.author_id,
    author_name: reply.profiles?.full_name || "You",
    author_avatar: reply.profiles?.avatar_url || null,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
  };
}
