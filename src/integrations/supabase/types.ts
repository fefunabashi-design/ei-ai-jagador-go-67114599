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
      match_chat_messages: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string
          message_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message: string
          message_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string
          message_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string
          position: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          position?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          match_id: string
          paid_at: string | null
          player_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          match_id: string
          paid_at?: string | null
          player_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          match_id?: string
          paid_at?: string | null
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_summons: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string
          position: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          position?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          position?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_summons_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_summons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          compatibility: number | null
          created_at: string
          format: string
          home_score: number | null
          home_team_id: string
          id: string
          location: string
          match_date: string
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          compatibility?: number | null
          created_at?: string
          format?: string
          home_score?: number | null
          home_team_id: string
          id?: string
          location: string
          match_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          compatibility?: number | null
          created_at?: string
          format?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          location?: string
          match_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidade_config: {
        Row: {
          ano: number
          id: string
          team_id: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ano: number
          id?: string
          team_id: string
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ano?: number
          id?: string
          team_id?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      mensalidades: {
        Row: {
          ano: number
          created_at: string
          data_pagamento: string | null
          id: string
          mes: number
          pago: boolean
          player_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes: number
          pago?: boolean
          player_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes?: number
          pago?: boolean
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          created_at: string
          goals: number | null
          id: string
          jersey_number: number | null
          matches: number | null
          name: string
          nickname: string | null
          phone: string | null
          position: string | null
          rating: number | null
          region: string | null
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          goals?: number | null
          id?: string
          jersey_number?: number | null
          matches?: number | null
          name: string
          nickname?: string | null
          phone?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          goals?: number | null
          id?: string
          jersey_number?: number | null
          matches?: number | null
          name?: string
          nickname?: string | null
          phone?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          id: string
          is_pro: boolean
          nickname: string | null
          phone: string | null
          region: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_pro?: boolean
          nickname?: string | null
          phone?: string | null
          region?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_pro?: boolean
          nickname?: string | null
          phone?: string | null
          region?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          abbreviation: string | null
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          coach_name: string | null
          created_at: string
          email: string | null
          field_address: string | null
          field_name: string | null
          format: string | null
          foundation_date: string | null
          founder_name: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          president_email: string | null
          president_name: string | null
          rating: number | null
          region: string | null
          substitute_name: string | null
          updated_at: string
          war_cry: string | null
        }
        Insert: {
          abbreviation?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          coach_name?: string | null
          created_at?: string
          email?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          president_email?: string | null
          president_name?: string | null
          rating?: number | null
          region?: string | null
          substitute_name?: string | null
          updated_at?: string
          war_cry?: string | null
        }
        Update: {
          abbreviation?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          coach_name?: string | null
          created_at?: string
          email?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          president_email?: string | null
          president_name?: string | null
          rating?: number | null
          region?: string | null
          substitute_name?: string | null
          updated_at?: string
          war_cry?: string | null
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
