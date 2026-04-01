// Auto-generated types from Supabase schema.
// Regenerate with: npx supabase gen types typescript --project-id qsqalllagfqhxrgcaawc > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
