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
          evidence_retention_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          evidence_retention_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          evidence_retention_days?: number;
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
      evidence_records: {
        Row: {
          evidence_id: string;
          schema_version: string;
          timestamp_utc: string;
          timestamp_source: string;
          workspace_id: string;
          repository_identifier: string;
          pull_request_id: string;
          commit_sha: string;
          base_commit_sha: string;
          author_identity: Json;
          ci_provider: string;
          decision_id: string;
          decision_version: string;
          decision_content_hash: string;
          diff_hash: string;
          diff_size_bytes: number;
          diff_files_touched: string[];
          judge_invocation: Json | null;
          deterministic_checks: Json;
          verdict: string;
          reason_code: string;
          reason_detail: string;
          override_data: Json | null;
          previous_evidence_hash: string | null;
          current_evidence_hash: string;
          signature: Json;
          created_at: string;
        };
        Insert: {
          evidence_id: string;
          schema_version?: string;
          timestamp_utc: string;
          timestamp_source?: string;
          workspace_id: string;
          repository_identifier: string;
          pull_request_id: string;
          commit_sha: string;
          base_commit_sha: string;
          author_identity: Json;
          ci_provider: string;
          decision_id: string;
          decision_version?: string;
          decision_content_hash: string;
          diff_hash: string;
          diff_size_bytes?: number;
          diff_files_touched?: string[];
          judge_invocation?: Json | null;
          deterministic_checks?: Json;
          verdict: string;
          reason_code: string;
          reason_detail?: string;
          override_data?: Json | null;
          previous_evidence_hash?: string | null;
          current_evidence_hash: string;
          signature: Json;
          created_at?: string;
        };
        Update: {
          reason_detail?: string;
          judge_invocation?: Json | null;
          deterministic_checks?: Json;
          override_data?: Json | null;
        };
      };
      evidence_chain_tips: {
        Row: {
          workspace_id: string;
          tip_evidence_id: string;
          tip_hash: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          tip_evidence_id: string;
          tip_hash: string;
          updated_at?: string;
        };
        Update: {
          tip_evidence_id?: string;
          tip_hash?: string;
          updated_at?: string;
        };
      };
      evidence_access_log: {
        Row: {
          access_id: string;
          timestamp_utc: string;
          actor_identity: Json;
          workspace_id: string;
          evidence_ids_accessed: string[] | null;
          query_descriptor: string | null;
          access_method: string;
          source_ip: string | null;
          user_agent: string | null;
        };
        Insert: {
          access_id?: string;
          timestamp_utc?: string;
          actor_identity: Json;
          workspace_id: string;
          evidence_ids_accessed?: string[] | null;
          query_descriptor?: string | null;
          access_method: string;
          source_ip?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, never>;
      };
      adr_cache: {
        Row: {
          id: string;
          workspace_id: string;
          repository_identifier: string;
          title: string;
          status: string;
          enforcement: string;
          scope: string[];
          content_hash: string;
          body: string | null;
          synced_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          repository_identifier: string;
          title: string;
          status?: string;
          enforcement?: string;
          scope?: string[];
          content_hash: string;
          body?: string | null;
          synced_at?: string;
        };
        Update: {
          title?: string;
          status?: string;
          enforcement?: string;
          scope?: string[];
          content_hash?: string;
          body?: string | null;
          synced_at?: string;
        };
      };
      case_c_signals: {
        Row: {
          id: string;
          workspace_id: string;
          repository_identifier: string;
          pr_url: string | null;
          pr_title: string | null;
          description: string;
          suggested_adr_title: string | null;
          files_involved: string[];
          status: string;
          evidence_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          repository_identifier: string;
          pr_url?: string | null;
          pr_title?: string | null;
          description: string;
          suggested_adr_title?: string | null;
          files_involved?: string[];
          status?: string;
          evidence_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          suggested_adr_title?: string | null;
          description?: string;
        };
      };
    };
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
export type WorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Row"];
export type WorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Row"];

export type InsertWorkspace = Database["public"]["Tables"]["workspaces"]["Insert"];
export type UpdateWorkspace = Database["public"]["Tables"]["workspaces"]["Update"];
export type InsertWorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Insert"];
export type UpdateWorkspacePolicies = Database["public"]["Tables"]["workspace_policies"]["Update"];
export type InsertWorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Insert"];
export type InsertWorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Insert"];
export type UpdateWorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Update"];
export type GitHubConnection = Database["public"]["Tables"]["github_connections"]["Row"];
export type EvidenceRecordRow = Database["public"]["Tables"]["evidence_records"]["Row"];
export type EvidenceChainTip = Database["public"]["Tables"]["evidence_chain_tips"]["Row"];
export type EvidenceAccessLogRow = Database["public"]["Tables"]["evidence_access_log"]["Row"];
