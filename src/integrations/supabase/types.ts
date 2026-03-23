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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcement_delivery: {
        Row: {
          announcement_id: string
          batch_no: string
          delivered_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          batch_no: string
          delivered_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          batch_no?: string
          delivered_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_delivery_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string
          batch_no: string
          id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          batch_no: string
          id?: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          batch_no?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          target_group: Database["public"]["Enums"]["target_group"]
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          target_group?: Database["public"]["Enums"]["target_group"]
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          target_group?: Database["public"]["Enums"]["target_group"]
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          receiver_batch_no: string
          sender_batch_no: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          receiver_batch_no: string
          sender_batch_no: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          receiver_batch_no?: string
          sender_batch_no?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_batch_no: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_batch_no: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_batch_no?: string
        }
        Relationships: []
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          id: string
          options: Json
          question: string
          target_group: Database["public"]["Enums"]["target_group"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          options: Json
          question: string
          target_group?: Database["public"]["Enums"]["target_group"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          options?: Json
          question?: string
          target_group?: Database["public"]["Enums"]["target_group"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          batch_no: string
          created_at: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          batch_no: string
          created_at?: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          batch_no?: string
          created_at?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      votes: {
        Row: {
          batch_no: string
          created_at: string
          id: string
          poll_id: string
          selected_option: string
        }
        Insert: {
          batch_no: string
          created_at?: string
          id?: string
          poll_id: string
          selected_option: string
        }
        Update: {
          batch_no?: string
          created_at?: string
          id?: string
          poll_id?: string
          selected_option?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_gender: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["gender_type"]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin_or_rep: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "boys_rep" | "girls_rep" | "student"
      gender_type: "boy" | "girl"
      target_group: "all" | "boys" | "girls"
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
    Enums: {
      app_role: ["admin", "boys_rep", "girls_rep", "student"],
      gender_type: ["boy", "girl"],
      target_group: ["all", "boys", "girls"],
    },
  },
} as const
