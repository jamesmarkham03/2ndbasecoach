// AUTO-GENERATED from the Supabase schema. Don't edit by hand.
// Regenerate after every database change (Supabase MCP: generate_typescript_types).

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
      lesson_items: {
        Row: {
          coach_id: string
          comment: string | null
          completed: boolean
          created_at: string
          custom_title: string | null
          id: string
          instructions: string | null
          lesson_id: string
          library_item_id: string | null
          minutes: number | null
          position: number
        }
        Insert: {
          coach_id?: string
          comment?: string | null
          completed?: boolean
          created_at?: string
          custom_title?: string | null
          id?: string
          instructions?: string | null
          lesson_id: string
          library_item_id?: string | null
          minutes?: number | null
          position?: number
        }
        Update: {
          coach_id?: string
          comment?: string | null
          completed?: boolean
          created_at?: string
          custom_title?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string
          library_item_id?: string | null
          minutes?: number | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_items_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          body: string
          coach_id: string
          created_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          body: string
          coach_id?: string
          created_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          body?: string
          coach_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plan_items: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          instructions: string | null
          library_item_id: string
          minutes: number | null
          plan_id: string
          position: number
        }
        Insert: {
          coach_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          library_item_id: string
          minutes?: number | null
          plan_id: string
          position?: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          library_item_id?: string
          minutes?: number | null
          plan_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_items_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          archived: boolean
          coach_id: string
          created_at: string
          description: string | null
          focus_area: string | null
          id: string
          is_starter: boolean
          legacy_id: string | null
          level: string | null
          name: string
        }
        Insert: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          description?: string | null
          focus_area?: string | null
          id?: string
          is_starter?: boolean
          legacy_id?: string | null
          level?: string | null
          name: string
        }
        Update: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          description?: string | null
          focus_area?: string | null
          id?: string
          is_starter?: boolean
          legacy_id?: string | null
          level?: string | null
          name?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          archived: boolean
          coach_id: string
          created_at: string
          id: string
          lesson_date: string
          overall_notes: string | null
          plan_id: string | null
          player_id: string
          title: string
        }
        Insert: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          id?: string
          lesson_date: string
          overall_notes?: string | null
          plan_id?: string | null
          player_id: string
          title?: string
        }
        Update: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          id?: string
          lesson_date?: string
          overall_notes?: string | null
          plan_id?: string | null
          player_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          archived: boolean
          coach_id: string
          created_at: string
          focus_areas: string[]
          id: string
          legacy_id: string | null
          levels: string[]
          minutes: number
          note: string
          source: string | null
          tags: string[]
          title: string
          type: string
        }
        Insert: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          focus_areas?: string[]
          id?: string
          legacy_id?: string | null
          levels?: string[]
          minutes?: number
          note?: string
          source?: string | null
          tags?: string[]
          title: string
          type: string
        }
        Update: {
          archived?: boolean
          coach_id?: string
          created_at?: string
          focus_areas?: string[]
          id?: string
          legacy_id?: string | null
          levels?: string[]
          minutes?: number
          note?: string
          source?: string | null
          tags?: string[]
          title?: string
          type?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          metric_type_id: string
          note: string | null
          player_id: string
          recorded_on: string
          value: number
        }
        Insert: {
          coach_id?: string
          created_at?: string
          id?: string
          metric_type_id: string
          note?: string | null
          player_id: string
          recorded_on?: string
          value: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          metric_type_id?: string
          note?: string | null
          player_id?: string
          recorded_on?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_metric_type_id_fkey"
            columns: ["metric_type_id"]
            isOneToOne: false
            referencedRelation: "metric_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_types: {
        Row: {
          archived: boolean
          coach_id: string | null
          created_at: string
          decimals: number
          higher_is_better: boolean
          id: string
          name: string
          sort_order: number
          unit: string
        }
        Insert: {
          archived?: boolean
          coach_id?: string | null
          created_at?: string
          decimals?: number
          higher_is_better?: boolean
          id?: string
          name: string
          sort_order?: number
          unit: string
        }
        Update: {
          archived?: boolean
          coach_id?: string | null
          created_at?: string
          decimals?: number
          higher_is_better?: boolean
          id?: string
          name?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          active: boolean
          bats: string | null
          birth_year: number | null
          coach_id: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          positions: string[]
          team: string | null
          throws: string | null
        }
        Insert: {
          active?: boolean
          bats?: string | null
          birth_year?: number | null
          coach_id?: string
          created_at?: string
          first_name: string
          id?: string
          last_name?: string
          notes?: string | null
          positions?: string[]
          team?: string | null
          throws?: string | null
        }
        Update: {
          active?: boolean
          bats?: string | null
          birth_year?: number | null
          coach_id?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          positions?: string[]
          team?: string | null
          throws?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
