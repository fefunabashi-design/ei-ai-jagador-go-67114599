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
      admin_subscriptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          pix_txid: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          pix_txid?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          pix_txid?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debitos: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          observacao: string | null
          team_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          id?: string
          observacao?: string | null
          team_id: string
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacao?: string | null
          team_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "debitos_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debitos_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
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
            foreignKeyName: "chat_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
          player_name: string | null
          team_side: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
          player_name?: string | null
          team_side?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
          player_name?: string | null
          team_side?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_guests: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          inviter_name: string | null
          match_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          inviter_name?: string | null
          match_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          inviter_name?: string | null
          match_id?: string
          name?: string
        }
        Relationships: []
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
            foreignKeyName: "lineups_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
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
          {
            foreignKeyName: "match_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_finalized_at: string | null
          away_hidden: boolean
          away_reported_away_score: number | null
          away_reported_home_score: number | null
          away_score: number | null
          away_team_id: string | null
          compatibility: number | null
          created_at: string
          format: string
          home_finalized_at: string | null
          home_hidden: boolean
          home_reported_away_score: number | null
          home_reported_home_score: number | null
          home_score: number | null
          home_team_id: string
          id: string
          location: string
          match_date: string
          status: string
          updated_at: string
        }
        Insert: {
          away_finalized_at?: string | null
          away_hidden?: boolean
          away_reported_away_score?: number | null
          away_reported_home_score?: number | null
          away_score?: number | null
          away_team_id?: string | null
          compatibility?: number | null
          created_at?: string
          format?: string
          home_finalized_at?: string | null
          home_hidden?: boolean
          home_reported_away_score?: number | null
          home_reported_home_score?: number | null
          home_score?: number | null
          home_team_id: string
          id?: string
          location: string
          match_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_finalized_at?: string | null
          away_hidden?: boolean
          away_reported_away_score?: number | null
          away_reported_home_score?: number | null
          away_score?: number | null
          away_team_id?: string | null
          compatibility?: number | null
          created_at?: string
          format?: string
          home_finalized_at?: string | null
          home_hidden?: boolean
          home_reported_away_score?: number | null
          home_reported_home_score?: number | null
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
            foreignKeyName: "matches_away_team_fk"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_fk"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_fk"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_fk"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
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
          mes: number | null
          team_id: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ano: number
          id?: string
          mes?: number | null
          team_id: string
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ano?: number
          id?: string
          mes?: number | null
          team_id?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "mensalidade_config_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidade_config_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "mensalidades_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_players_unrestricted"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_posts: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          event_id: string
          event_title: string
          event_type: string
          id: string
          match_id: string | null
          photo_url: string
          team_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          event_id: string
          event_title: string
          event_type: string
          id?: string
          match_id?: string | null
          photo_url: string
          team_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          event_id?: string
          event_title?: string
          event_type?: string
          id?: string
          match_id?: string | null
          photo_url?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_posts_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_posts_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string | null
          goals: number | null
          id: string
          jersey_number: number | null
          last_name: string | null
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
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          goals?: number | null
          id?: string
          jersey_number?: number | null
          last_name?: string | null
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
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          goals?: number | null
          id?: string
          jersey_number?: number | null
          last_name?: string | null
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
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          data: string
          id: string
          legenda: string | null
          tipo: string
          url: string
        }
        Insert: {
          author_id: string
          created_at?: string
          data?: string
          id?: string
          legenda?: string | null
          tipo: string
          url: string
        }
        Update: {
          author_id?: string
          created_at?: string
          data?: string
          id?: string
          legenda?: string | null
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string | null
          gender: string | null
          id: string
          is_active: boolean
          is_pro: boolean
          is_super_admin: boolean
          last_name: string | null
          nickname: string | null
          phone: string | null
          primary_color: string | null
          region: string | null
          role: string
          state: string | null
          subscription_expires_at: string | null
          subscription_status: string
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          is_pro?: boolean
          is_super_admin?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          primary_color?: string | null
          region?: string | null
          role?: string
          state?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          is_pro?: boolean
          is_super_admin?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          primary_color?: string | null
          region?: string | null
          role?: string
          state?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resenha_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "resenha_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "resenha_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenha_comments_post_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenha_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_posts: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          id: string
          match_id: string | null
          match_label: string | null
          photo_url: string
          team_id: string | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          match_label?: string | null
          photo_url: string
          team_id?: string | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          match_label?: string | null
          photo_url?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resenha_posts_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenha_posts_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenha_posts_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_reactions_post_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resenha_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_favorites: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          abbreviation: string | null
          addr_bairro: string | null
          addr_cep: string | null
          addr_cidade: string | null
          addr_numero: string | null
          addr_rua: string | null
          addr_uf: string | null
          admin_cpf: string | null
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          assistant_coach_email: string | null
          assistant_coach_name: string | null
          assistant_coach_phone: string | null
          categoria: string | null
          coach_email: string | null
          coach_name: string | null
          coach_phone: string | null
          created_at: string
          email: string | null
          estilo: string | null
          field_address: string | null
          field_name: string | null
          format: string | null
          foundation_date: string | null
          founder_name: string | null
          gender: string | null
          has_field: boolean | null
          id: string
          instagram: string | null
          logo_url: string | null
          mobile: string | null
          name: string
          observacoes: string | null
          owner_id: string
          phone: string | null
          play_days: string[] | null
          play_schedule: Json
          play_time_end: string | null
          play_time_start: string | null
          president_email: string | null
          president_name: string | null
          president_phone: string | null
          rating: number | null
          region: string | null
          sub_categoria: string | null
          sub1_cpf: string | null
          sub1_email: string | null
          sub1_name: string | null
          sub1_phone: string | null
          substitute_name: string | null
          updated_at: string
          war_cry: string | null
        }
        Insert: {
          abbreviation?: string | null
          addr_bairro?: string | null
          addr_cep?: string | null
          addr_cidade?: string | null
          addr_numero?: string | null
          addr_rua?: string | null
          addr_uf?: string | null
          admin_cpf?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          assistant_coach_email?: string | null
          assistant_coach_name?: string | null
          assistant_coach_phone?: string | null
          categoria?: string | null
          coach_email?: string | null
          coach_name?: string | null
          coach_phone?: string | null
          created_at?: string
          email?: string | null
          estilo?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          gender?: string | null
          has_field?: boolean | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          mobile?: string | null
          name: string
          observacoes?: string | null
          owner_id: string
          phone?: string | null
          play_days?: string[] | null
          play_schedule?: Json
          play_time_end?: string | null
          play_time_start?: string | null
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          rating?: number | null
          region?: string | null
          sub_categoria?: string | null
          sub1_cpf?: string | null
          sub1_email?: string | null
          sub1_name?: string | null
          sub1_phone?: string | null
          substitute_name?: string | null
          updated_at?: string
          war_cry?: string | null
        }
        Update: {
          abbreviation?: string | null
          addr_bairro?: string | null
          addr_cep?: string | null
          addr_cidade?: string | null
          addr_numero?: string | null
          addr_rua?: string | null
          addr_uf?: string | null
          admin_cpf?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          assistant_coach_email?: string | null
          assistant_coach_name?: string | null
          assistant_coach_phone?: string | null
          categoria?: string | null
          coach_email?: string | null
          coach_name?: string | null
          coach_phone?: string | null
          created_at?: string
          email?: string | null
          estilo?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          gender?: string | null
          has_field?: boolean | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          mobile?: string | null
          name?: string
          observacoes?: string | null
          owner_id?: string
          phone?: string | null
          play_days?: string[] | null
          play_schedule?: Json
          play_time_end?: string | null
          play_time_start?: string | null
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          rating?: number | null
          region?: string | null
          sub_categoria?: string | null
          sub1_cpf?: string | null
          sub1_email?: string | null
          sub1_name?: string | null
          sub1_phone?: string | null
          substitute_name?: string | null
          updated_at?: string
          war_cry?: string | null
        }
        Relationships: []
      }
      trial_blocklist: {
        Row: {
          created_at: string
          emails: string[]
          id: string
          source_team_id: string | null
          source_user_id: string | null
          team_name_normalized: string
        }
        Insert: {
          created_at?: string
          emails?: string[]
          id?: string
          source_team_id?: string | null
          source_user_id?: string | null
          team_name_normalized: string
        }
        Update: {
          created_at?: string
          emails?: string[]
          id?: string
          source_team_id?: string | null
          source_user_id?: string | null
          team_name_normalized?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_players: {
        Row: {
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          goals: number | null
          id: string | null
          jersey_number: number | null
          last_name: string | null
          matches: number | null
          name: string | null
          nickname: string | null
          position: string | null
          rating: number | null
          region: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: number | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
          matches?: number | null
          name?: string | null
          nickname?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: number | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
          matches?: number | null
          name?: string | null
          nickname?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_players_unrestricted: {
        Row: {
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          goals: number | null
          id: string | null
          jersey_number: number | null
          last_name: string | null
          matches: number | null
          name: string | null
          nickname: string | null
          position: string | null
          rating: number | null
          region: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: number | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
          matches?: number | null
          name?: string | null
          nickname?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: number | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
          matches?: number | null
          name?: string | null
          nickname?: string | null
          position?: string | null
          rating?: number | null
          region?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          nickname: string | null
          region: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          nickname?: string | null
          region?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          nickname?: string | null
          region?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_teams: {
        Row: {
          abbreviation: string | null
          addr_bairro: string | null
          addr_cep: string | null
          addr_cidade: string | null
          addr_numero: string | null
          addr_rua: string | null
          addr_uf: string | null
          admin_name: string | null
          admin_phone: string | null
          categoria: string | null
          coach_name: string | null
          created_at: string | null
          estilo: string | null
          field_address: string | null
          field_name: string | null
          format: string | null
          foundation_date: string | null
          founder_name: string | null
          gender: string | null
          has_field: boolean | null
          id: string | null
          instagram: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          phone: string | null
          play_days: string[] | null
          play_schedule: Json | null
          play_time_end: string | null
          play_time_start: string | null
          rating: number | null
          region: string | null
          sub_categoria: string | null
          war_cry: string | null
        }
        Insert: {
          abbreviation?: string | null
          addr_bairro?: string | null
          addr_cep?: string | null
          addr_cidade?: string | null
          addr_numero?: string | null
          addr_rua?: string | null
          addr_uf?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          categoria?: string | null
          coach_name?: string | null
          created_at?: string | null
          estilo?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          gender?: string | null
          has_field?: boolean | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          play_days?: string[] | null
          play_schedule?: Json | null
          play_time_end?: string | null
          play_time_start?: string | null
          rating?: number | null
          region?: string | null
          sub_categoria?: string | null
          war_cry?: string | null
        }
        Update: {
          abbreviation?: string | null
          addr_bairro?: string | null
          addr_cep?: string | null
          addr_cidade?: string | null
          addr_numero?: string | null
          addr_rua?: string | null
          addr_uf?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          categoria?: string | null
          coach_name?: string | null
          created_at?: string | null
          estilo?: string | null
          field_address?: string | null
          field_name?: string | null
          format?: string | null
          foundation_date?: string | null
          founder_name?: string | null
          gender?: string | null
          has_field?: boolean | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          phone?: string | null
          play_days?: string[] | null
          play_schedule?: Json | null
          play_time_end?: string | null
          play_time_start?: string | null
          rating?: number | null
          region?: string | null
          sub_categoria?: string | null
          war_cry?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_match_realtime: {
        Args: { _match_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_trial_blocked: {
        Args: { _email: string; _team_name?: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_email: { Args: { _email: string }; Returns: string }
      normalize_team_name: { Args: { _name: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
