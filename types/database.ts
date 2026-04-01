export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          file_name: string | null
          github_url: string | null
          id: string
          name: string
          source: Database["public"]["Enums"]["artifact_source"]
          source_url: string | null
          status: Database["public"]["Enums"]["artifact_status"]
          submitted_by: string
          type: Database["public"]["Enums"]["artifact_type"]
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          github_url?: string | null
          id?: string
          name: string
          source: Database["public"]["Enums"]["artifact_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["artifact_status"]
          submitted_by: string
          type: Database["public"]["Enums"]["artifact_type"]
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          github_url?: string | null
          id?: string
          name?: string
          source?: Database["public"]["Enums"]["artifact_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["artifact_status"]
          submitted_by?: string
          type?: Database["public"]["Enums"]["artifact_type"]
        }
        Relationships: []
      }
      laudos: {
        Row: {
          artifact_id: string
          checks: Json
          created_at: string | null
          id: string
          model_used: string | null
          resultado: Database["public"]["Enums"]["laudo_resultado"]
          resumo: string
          score: number | null
          tempo_analise_ms: number | null
        }
        Insert: {
          artifact_id: string
          checks?: Json
          created_at?: string | null
          id?: string
          model_used?: string | null
          resultado: Database["public"]["Enums"]["laudo_resultado"]
          resumo: string
          score?: number | null
          tempo_analise_ms?: number | null
        }
        Update: {
          artifact_id?: string
          checks?: Json
          created_at?: string | null
          id?: string
          model_used?: string | null
          resultado?: Database["public"]["Enums"]["laudo_resultado"]
          resumo?: string
          score?: number | null
          tempo_analise_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "laudos_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
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
      artifact_source: "upload" | "github" | "url"
      artifact_status: "pending" | "analyzing" | "done" | "error"
      artifact_type:
        | "planilha"
        | "script"
        | "dashboard"
        | "flow"
        | "query"
        | "outro"
      laudo_resultado: "aprovado" | "ajustes_necessarios" | "reprovado"
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

export const Constants = {
  public: {
    Enums: {
      artifact_source: ["upload", "github", "url"],
      artifact_status: ["pending", "analyzing", "done", "error"],
      artifact_type: [
        "planilha",
        "script",
        "dashboard",
        "flow",
        "query",
        "outro",
      ],
      laudo_resultado: ["aprovado", "ajustes_necessarios", "reprovado"],
    },
  },
} as const
