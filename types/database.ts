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
          role: string | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          locale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          locale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          ci_token_hash: string | null;
          ci_token_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          owner_id: string;
          ci_token_hash?: string | null;
          ci_token_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          ci_token_hash?: string | null;
          ci_token_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          workspace_role: "admin" | "member";
          decision_role: "approver" | "contributor" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          workspace_role?: "admin" | "member";
          decision_role?: "approver" | "contributor" | "viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          workspace_role?: "admin" | "member";
          decision_role?: "approver" | "contributor" | "viewer";
          created_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          workspace_role: "admin" | "member";
          decision_role: "approver" | "contributor" | "viewer";
          invited_by: string;
          token: string;
          expires_at: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          workspace_role?: "admin" | "member";
          decision_role?: "approver" | "contributor" | "viewer";
          invited_by: string;
          token: string;
          expires_at: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          workspace_role?: "admin" | "member";
          decision_role?: "approver" | "contributor" | "viewer";
          invited_by?: string;
          token?: string;
          expires_at?: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          created_at?: string;
        };
      };
      workspace_policies: {
        Row: {
          workspace_id: string;
          require_linked_pr: boolean;
          require_approved: boolean;
          high_impact: boolean;
          judge_blocking: boolean;
          judge_tolerance_percent: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          require_linked_pr?: boolean;
          require_approved?: boolean;
          high_impact?: boolean;
          judge_blocking?: boolean;
          judge_tolerance_percent?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          require_linked_pr?: boolean;
          require_approved?: boolean;
          high_impact?: boolean;
          judge_blocking?: boolean;
          judge_tolerance_percent?: number | null;
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
          workspace_id: string;
          github_repo_full_name: string | null;
          github_default_branch: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          workspace_id: string;
          github_repo_full_name?: string | null;
          github_default_branch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          workspace_id?: string;
          github_repo_full_name?: string | null;
          github_default_branch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      decisions: {
        Row: {
          id: string;
          project_id: string;
          workspace_id: string;
          adr_ref: string;
          title: string;
          status: "proposed" | "approved" | "superseded" | "rejected";
          context: string;
          options: string[];
          decision: string;
          consequences: string;
          tags: string[];
          external_links: { url: string; label?: string }[];
          pull_request_urls: string[];
          linked_decision_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          workspace_id?: string;
          adr_ref?: string;
          title: string;
          status?: "proposed" | "approved" | "superseded" | "rejected";
          context?: string;
          options?: string[];
          decision?: string;
          consequences?: string;
          tags?: string[];
          external_links?: { url: string; label?: string }[];
          pull_request_urls?: string[];
          linked_decision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          workspace_id?: string;
          adr_ref?: string;
          title?: string;
          status?: "proposed" | "approved" | "superseded" | "rejected";
          context?: string;
          options?: string[];
          decision?: string;
          consequences?: string;
          tags?: string[];
          external_links?: { url: string; label?: string }[];
          pull_request_urls?: string[];
          linked_decision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      github_connections: {
        Row: {
          id: string;
          user_id: string;
          github_user_id: number;
          github_username: string;
          access_token: string;
          scope: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          github_user_id: number;
          github_username: string;
          access_token: string;
          scope?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          github_user_id?: number;
          github_username?: string;
          access_token?: string;
          scope?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      judge_usage: {
        Row: {
          workspace_id: string;
          period: string;
          input_tokens: number;
          output_tokens: number;
          billed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          period: string;
          input_tokens?: number;
          output_tokens?: number;
          billed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          period?: string;
          input_tokens?: number;
          output_tokens?: number;
          billed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      judge_gate_runs: {
        Row: {
          id: string;
          workspace_id: string;
          decision_id: string | null;
          decision_adr_ref: string | null;
          decision_title: string | null;
          pr_title: string | null;
          pr_url: string | null;
          base_sha: string | null;
          head_sha: string | null;
          allowed: boolean;
          advisory: boolean;
          confidence_percent: number | null;
          reason: string | null;
          advisory_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          decision_id?: string | null;
          decision_adr_ref?: string | null;
          decision_title?: string | null;
          pr_title?: string | null;
          pr_url?: string | null;
          base_sha?: string | null;
          head_sha?: string | null;
          allowed: boolean;
          advisory?: boolean;
          confidence_percent?: number | null;
          reason?: string | null;
          advisory_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          decision_id?: string | null;
          decision_adr_ref?: string | null;
          decision_title?: string | null;
          pr_title?: string | null;
          pr_url?: string | null;
          base_sha?: string | null;
          head_sha?: string | null;
          allowed?: boolean;
          advisory?: boolean;
          confidence_percent?: number | null;
          reason?: string | null;
          advisory_message?: string | null;
          created_at?: string;
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
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type WorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Row"];
export type WorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type DbDecision = Database["public"]["Tables"]["decisions"]["Row"];

export type InsertWorkspace = Database["public"]["Tables"]["workspaces"]["Insert"];
export type UpdateWorkspace = Database["public"]["Tables"]["workspaces"]["Update"];
export type InsertWorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Insert"];
export type UpdateWorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Update"];
export type InsertWorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Insert"];
export type InsertWorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Insert"];
export type UpdateWorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Update"];
export type InsertProject = Database["public"]["Tables"]["projects"]["Insert"];
export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"];
export type InsertDecision = Database["public"]["Tables"]["decisions"]["Insert"];
export type UpdateDecision = Database["public"]["Tables"]["decisions"]["Update"];
export type JudgeUsage = Database["public"]["Tables"]["judge_usage"]["Row"];
export type JudgeGateRun = Database["public"]["Tables"]["judge_gate_runs"]["Row"];
export type GitHubConnection = Database["public"]["Tables"]["github_connections"]["Row"];
