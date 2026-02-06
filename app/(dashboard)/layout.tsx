import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { FloatingNewDecisionButton } from "@/components/dashboard/floating-new-decision-button";
import { PreparingWorkspaceView } from "@/components/dashboard/preparing-workspace-view";
import { getAllWorkspacesForCurrentUser } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { getEffectivePlanId } from "@/lib/billing";

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

  const [workspaces, selectedWorkspaceId, subscription] = await Promise.all([
    getAllWorkspacesForCurrentUser(),
    getSelectedWorkspaceId(),
    supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).single(),
  ]);

  if (workspaces.length === 0) {
    return <PreparingWorkspaceView />;
  }

  const planId = getEffectivePlanId(subscription?.data?.plan_id);

  return (
    <div className="flex h-screen bg-app-bg">
      <Sidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        planId={planId}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <FloatingNewDecisionButton />
    </div>
  );
}
