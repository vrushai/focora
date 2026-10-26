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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      doubt_hearts: {
        Row: {
          created_at: string
          doubt_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doubt_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          doubt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_hearts_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubt_library"
            referencedColumns: ["id"]
          },
        ]
      }
      doubt_library: {
        Row: {
          answer: Json
          author_name: string
          created_at: string
          hearts: number
          id: string
          question: string
          subject: string
          topic: string
          user_id: string | null
        }
        Insert: {
          answer?: Json
          author_name?: string
          created_at?: string
          hearts?: number
          id?: string
          question: string
          subject?: string
          topic?: string
          user_id?: string | null
        }
        Update: {
          answer?: Json
          author_name?: string
          created_at?: string
          hearts?: number
          id?: string
          question?: string
          subject?: string
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      doubts: {
        Row: {
          answer: Json
          created_at: string
          id: string
          question: string
          subject: string
          topic: string
          user_id: string
        }
        Insert: {
          answer?: Json
          created_at?: string
          id?: string
          question: string
          subject?: string
          topic?: string
          user_id?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          question?: string
          subject?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          exam_date: string
          id: string
          is_sample: boolean
          name: string
          progress: number
          subject: string
          topics: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          id?: string
          is_sample?: boolean
          name: string
          progress?: number
          subject?: string
          topics?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          id?: string
          is_sample?: boolean
          name?: string
          progress?: number
          subject?: string
          topics?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          accumulated_seconds: number
          actual_min: number
          completed: boolean
          finished_at: string | null
          id: string
          is_sample: boolean
          paused_at: string | null
          planned_min: number
          points: number
          started_at: string
          subject: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          accumulated_seconds?: number
          actual_min?: number
          completed?: boolean
          finished_at?: string | null
          id?: string
          is_sample?: boolean
          paused_at?: string | null
          planned_min: number
          points?: number
          started_at?: string
          subject?: string
          task_id?: string | null
          user_id?: string
        }
        Update: {
          accumulated_seconds?: number
          actual_min?: number
          completed?: boolean
          finished_at?: string | null
          id?: string
          is_sample?: boolean
          paused_at?: string | null
          planned_min?: number
          points?: number
          started_at?: string
          subject?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          display_name: string
          group_id: string
          status: string
          status_at: string
          user_id: string
        }
        Insert: {
          display_name?: string
          group_id: string
          status?: string
          status_at?: string
          user_id?: string
        }
        Update: {
          display_name?: string
          group_id?: string
          status?: string
          status_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name?: string
          group_id: string
          id?: string
          reply_to?: string | null
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          group_id?: string
          id?: string
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_task_done: {
        Row: {
          task_id: string
          user_id: string
        }
        Insert: {
          task_id: string
          user_id?: string
        }
        Update: {
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_task_done_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "group_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          due_date: string | null
          group_id: string
          id: string
          priority: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          group_id: string
          id?: string
          priority?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          group_id?: string
          id?: string
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          dedupe_key: string | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          read?: boolean
          title: string
          user_id?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      points_awards: {
        Row: {
          awarded_at: string
          id: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          points?: number
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          custom_focus_min: number
          daily_goal_min: number
          focus_preset: string
          grade: string
          id: string
          leave_warning: boolean
          name: string
          notification_prefs: Json
          onboarded: boolean
          points: number
          problem: string
          reminder_style: string
          reminders_enabled: boolean
          study_hours: string
          subjects: string[]
        }
        Insert: {
          created_at?: string
          custom_focus_min?: number
          daily_goal_min?: number
          focus_preset?: string
          grade?: string
          id: string
          leave_warning?: boolean
          name?: string
          notification_prefs?: Json
          onboarded?: boolean
          points?: number
          problem?: string
          reminder_style?: string
          reminders_enabled?: boolean
          study_hours?: string
          subjects?: string[]
        }
        Update: {
          created_at?: string
          custom_focus_min?: number
          daily_goal_min?: number
          focus_preset?: string
          grade?: string
          id?: string
          leave_warning?: boolean
          name?: string
          notification_prefs?: Json
          onboarded?: boolean
          points?: number
          problem?: string
          reminder_style?: string
          reminders_enabled?: boolean
          study_hours?: string
          subjects?: string[]
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          created_at: string
          goal: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          goal?: string
          id?: string
          invite_code?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          goal?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string
          due_at: string | null
          duration_min: number
          id: string
          is_sample: boolean
          notes: string
          priority: string
          reminder_min: number | null
          repeat: string
          sort_order: number | null
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          duration_min?: number
          id?: string
          is_sample?: boolean
          notes?: string
          priority?: string
          reminder_min?: number | null
          repeat?: string
          sort_order?: number | null
          subject?: string
          title: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          duration_min?: number
          id?: string
          is_sample?: boolean
          notes?: string
          priority?: string
          reminder_min?: number | null
          repeat?: string
          sort_order?: number | null
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extend_focus_session: {
        Args: { _extra_min: number; _session_id: string }
        Returns: number
      }
      finish_focus_session: {
        Args: { _completed: boolean; _session_id: string }
        Returns: {
          accumulated_seconds: number
          actual_min: number
          completed: boolean
          finished_at: string | null
          id: string
          is_sample: boolean
          paused_at: string | null
          planned_min: number
          points: number
          started_at: string
          subject: string
          task_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "focus_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      join_group_by_code: {
        Args: { _code: string; _name: string }
        Returns: string
      }
      reset_own_points: { Args: never; Returns: undefined }
      set_focus_session_paused: {
        Args: { _paused: boolean; _session_id: string }
        Returns: undefined
      }
      start_focus_session: {
        Args: { _planned_min: number; _subject: string; _task_id: string }
        Returns: string
      }
      toggle_doubt_heart: { Args: { _doubt_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
