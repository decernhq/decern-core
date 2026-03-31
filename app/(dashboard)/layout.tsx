import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { FloatingNewDecisionButton } from "@/components/dashboard/floating-new-decision-button";
import { PreparingWorkspaceView } from "@/components/dashboard/preparing-workspace-view";
import { getAllWorkspacesForCurrentUser } from "@/lib/queries/workspaces";
import { getSelectedWorkspaceId } from "@/lib/workspace-cookie";
import { getEffectivePlanId } from "@/lib/billing";
import { syncSubscriptionIfStale } from "@/lib/sync-subscription";
import { AutoCheckout } from "@/components/dashboard/auto-checkout";

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
    supabase.from("subscriptions").select("plan_id, stripe_customer_id, current_period_end, status").eq("user_id", user.id).single(),
  ]);

  if (workspaces.length === 0) {
    return <PreparingWorkspaceView />;
  }

  const sub = subscription?.data;
  await syncSubscriptionIfStale(
    user.id,
    sub?.stripe_customer_id ?? null,
    sub?.current_period_end ?? null,
    sub?.status ?? null
  );

  // Re-read plan after potential sync (the sync may have changed it)
  const { data: freshSub } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", user.id)
    .single();

  const selectedWorkspace = selectedWorkspaceId
    ? workspaces.find((w) => w.id === selectedWorkspaceId) ?? null
    : null;
  const canManageSelectedWorkspacePlan = selectedWorkspace
    ? selectedWorkspace.owner_id === user.id
    : true;

  // Use the workspace owner's plan so invited members see the right features.
  // Falls back to the current user's plan when they own the workspace (or none selected).
  let planId: ReturnType<typeof getEffectivePlanId>;
  if (selectedWorkspace && selectedWorkspace.owner_id !== user.id) {
    const { data: ownerSub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", selectedWorkspace.owner_id)
      .single();
    planId = getEffectivePlanId(ownerSub?.plan_id);
  } else {
    planId = getEffectivePlanId(freshSub?.plan_id ?? sub?.plan_id);
  }

  return (
    <div className="flex h-screen bg-app-bg">
      <Sidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        planId={planId}
        canManageSelectedWorkspacePlan={canManageSelectedWorkspacePlan}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <FloatingNewDecisionButton />
      <AutoCheckout currentPlan={planId} />
    </div>
  );
}
