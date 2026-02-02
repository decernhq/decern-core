/**
 * Supabase Database Types
 * These types map to the database schema defined in supabase/migrations/
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      decisions: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          status: "proposed" | "approved" | "superseded" | "rejected";
          context: string;
          options: string[];
          decision: string;
          consequences: string;
          tags: string[];
          external_links: { url: string; label?: string }[];
          linked_decision_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          status?: "proposed" | "approved" | "superseded" | "rejected";
          context?: string;
          options?: string[];
          decision?: string;
          consequences?: string;
          tags?: string[];
          external_links?: { url: string; label?: string }[];
          linked_decision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          status?: "proposed" | "approved" | "superseded" | "rejected";
          context?: string;
          options?: string[];
          decision?: string;
          consequences?: string;
          tags?: string[];
          external_links?: { url: string; label?: string }[];
          linked_decision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      decision_status: "proposed" | "approved" | "superseded" | "rejected";
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type DbDecision = Database["public"]["Tables"]["decisions"]["Row"];

export type InsertProject = Database["public"]["Tables"]["projects"]["Insert"];
export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"];

export type InsertDecision = Database["public"]["Tables"]["decisions"]["Insert"];
export type UpdateDecision = Database["public"]["Tables"]["decisions"]["Update"];
