export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      beta_agreements: {
        Row: {
          id: string
          signed_at: string
          signed_name: string | null
          user_id: string
          version: string
        }
        Insert: {
          id?: string
          signed_at?: string
          signed_name?: string | null
          user_id: string
          version?: string
        }
        Update: {
          id?: string
          signed_at?: string
          signed_name?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_agreements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      code_requests: {
        Row: {
          approved_at: string | null
          eligible_at: string | null
          id: string
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          eligible_at?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          eligible_at?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_color: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          emoji: string | null
          id: string
          is_private: boolean | null
          name: string
          profile_image_url: string | null
        }
        Insert: {
          banner_color?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          profile_image_url?: string | null
        }
        Update: {
          banner_color?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          profile_image_url?: string | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string | null
          created_at: string | null
          id: string
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string | null
          content: string
          created_at: string | null
          flair: string | null
          id: string
          image_url: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          content: string
          created_at?: string | null
          flair?: string | null
          id?: string
          image_url?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          content?: string
          created_at?: string | null
          flair?: string | null
          id?: string
          image_url?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tags: {
        Row: {
          bg: string | null
          color: string
          community_id: string | null
          created_at: string | null
          id: string
          label: string
        }
        Insert: {
          bg?: string | null
          color: string
          community_id?: string | null
          created_at?: string | null
          id?: string
          label: string
        }
        Update: {
          bg?: string | null
          color?: string
          community_id?: string | null
          created_at?: string | null
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_flairs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          last_message_at: string | null
          last_message_text: string | null
          user1_id: string | null
          user2_id: string | null
        }
        Insert: {
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          user1_id?: string | null
          user2_id?: string | null
        }
        Update: {
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          user1_id?: string | null
          user2_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_posts: {
        Row: {
          background_color: string | null
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          text_color: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          text_color?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          text_color?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moodboard_items: {
        Row: {
          created_at: string | null
          id: string
          moodboard_id: string | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          moodboard_id?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          moodboard_id?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moodboard_items_moodboard_id_fkey"
            columns: ["moodboard_id"]
            isOneToOne: false
            referencedRelation: "moodboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodboard_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodboard_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moodboards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moodboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          community_id: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          is_read: boolean | null
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          created_at: string
          post_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          headline: string | null
          id: string
          image_url: string | null
          is_anonymous: boolean | null
          response_type: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          response_type?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_anonymous?: boolean | null
          response_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned: boolean | null
          banned_at: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          current_streak: number | null
          display_name: string | null
          email: string | null
          gender_declared: boolean | null
          id: string
          invited_by: string | null
          last_post_date: string | null
          longest_streak: number | null
          push_token: string | null
          terms_accepted_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          banned_at?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          email?: string | null
          gender_declared?: boolean | null
          id: string
          invited_by?: string | null
          last_post_date?: string | null
          longest_streak?: number | null
          push_token?: string | null
          terms_accepted_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          banned_at?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          email?: string | null
          gender_declared?: boolean | null
          id?: string
          invited_by?: string | null
          last_post_date?: string | null
          longest_streak?: number | null
          push_token?: string | null
          terms_accepted_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          reason: string
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          screenshot_url: string | null
          status: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          screenshot_url?: string | null
          status?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          screenshot_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          name: string
          reason: string | null
          status: string | null
          tiktok: string | null
          twitter: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          name: string
          reason?: string | null
          status?: string | null
          tiktok?: string | null
          twitter?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
          name?: string
          reason?: string | null
          status?: string | null
          tiktok?: string | null
          twitter?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      invite_codes_view: {
        Row: {
          code: string | null
          created_at: string | null
          created_by_username: string | null
          id: string | null
          used_at: string | null
          used_by_username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_user: { Args: never; Returns: undefined }
      get_trending_hashtags: {
        Args: { days_back?: number; limit_n?: number }
        Returns: {
          count: number
          tag: string
        }[]
      }
      search_hashtags: {
        Args: { limit_n?: number; prefix: string }
        Returns: {
          count: number
          tag: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
