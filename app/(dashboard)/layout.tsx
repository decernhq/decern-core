import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { FloatingNewDecisionButton } from "@/components/dashboard/floating-new-decision-button";
import { getWorkspacesForCurrentUser } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [workspaces, selectedWorkspaceId] = await Promise.all([
    getWorkspacesForCurrentUser(),
    getSelectedWorkspaceId(),
  ]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <FloatingNewDecisionButton />
    </div>
  );
}
