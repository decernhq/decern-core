import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";
import { Button } from "@/components/ui/button";
import { AcceptInviteButton } from "./accept-invite-button";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage(props: InvitePageProps) {
  const params = await props.params;
  const inviteToken = params.token;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const invite = await getWorkspaceInvitationByToken(inviteToken);
  if (!invite) {
    notFound();
  }

  const t = await getTranslations("invite");

  const userEmail = user?.email?.toLowerCase() ?? null;
  const emailMatches = userEmail === invite.email.toLowerCase();

  const content = !user ? (
    <>
      <p className="mt-6 text-sm text-gray-600">
        {t("loginToAccept")}
      </p>
      <Link href={`/login?next=${encodeURIComponent(`/dashboard/invite/${inviteToken}`)}`}>
        <Button className="mt-4">{t("logIn")}</Button>
      </Link>
    </>
  ) : !emailMatches ? (
    <>
      <p className="mt-6 text-sm text-amber-700">
        {t("wrongAccount")}{" "}
        <strong>{invite.email}</strong>.
      </p>
      <Link href={`/login?next=${encodeURIComponent(`/dashboard/invite/${inviteToken}`)}`}>
        <Button variant="outline" className="mt-4">
          {t("switchAccount")}
        </Button>
      </Link>
    </>
  ) : (
    <div className="mt-6">
      <AcceptInviteButton token={inviteToken} />
    </div>
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{t("inviteToWorkspace")}</h1>
        <p className="mt-3 text-gray-600">
          {t("invitedToWorkspace")} <strong>{invite.workspace_name}</strong>.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {t("inviteSentTo")} <strong>{invite.email}</strong>.
        </p>
        {content}
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
