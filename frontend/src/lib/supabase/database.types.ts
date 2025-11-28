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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          created_at: string
          failed_at: string | null
          finished_at: string | null
          flavor: string | null
          id: string
          model: string | null
          order: number
          owner_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          failed_at?: string | null
          finished_at?: string | null
          flavor?: string | null
          id?: string
          model?: string | null
          order: number
          owner_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          failed_at?: string | null
          finished_at?: string | null
          flavor?: string | null
          id?: string
          model?: string | null
          order?: number
          owner_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          credits: number
          disabled: boolean
          expires_at: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          credits: number
          disabled?: boolean
          expires_at?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          disabled?: boolean
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      coupons_usage: {
        Row: {
          coupon_id: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logo_generations: {
        Row: {
          created_at: string
          id: string
          logo_project_id: string
          owner_id: string
          status: Database["public"]["Enums"]["generation_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          logo_project_id: string
          owner_id: string
          status?: Database["public"]["Enums"]["generation_status"]
        }
        Update: {
          created_at?: string
          id?: string
          logo_project_id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["generation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "logo_generations_logo_project_id_fkey"
            columns: ["logo_project_id"]
            isOneToOne: false
            referencedRelation: "logo_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logo_generations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logo_projects: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          prompt: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          prompt: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "logo_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          api_key: string
          created_at: string
          credits: number
          id: string
          stripe_customer_id: string | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tier: Database["public"]["Enums"]["tier_type"]
        }
        Insert: {
          api_key?: string
          created_at?: string
          credits?: number
          id: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: Database["public"]["Enums"]["tier_type"]
        }
        Update: {
          api_key?: string
          created_at?: string
          credits?: number
          id?: string
          stripe_customer_id?: string | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: Database["public"]["Enums"]["tier_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          flavors: string[]
          id: string
          models: string[]
          name: string
          owner_id: string
          prompt: string
        }
        Insert: {
          created_at?: string
          flavors: string[]
          id?: string
          models: string[]
          name?: string
          owner_id: string
          prompt: string
        }
        Update: {
          created_at?: string
          flavors?: string[]
          id?: string
          models?: string[]
          name?: string
          owner_id?: string
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      generation_status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED"
      tier_type: "FREE" | "PRO"
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
      generation_status: ["IN_PROGRESS", "SUCCEEDED", "FAILED"],
      tier_type: ["FREE", "PRO"],
    },
  },
} as const
