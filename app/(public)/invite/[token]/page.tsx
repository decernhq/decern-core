import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";
import { Button } from "@/components/ui/button";

interface PublicInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicInvitePage(props: PublicInvitePageProps) {
  const { token } = await props.params;
  const invite = await getWorkspaceInvitationByToken(token);

  if (!invite) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (user) {
    redirect(`/dashboard/invite/${token}`);
  }

  const t = await getTranslations("invite");

  const signupUrl = `/signup?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{t("inviteToWorkspace")}</h1>
        <p className="mt-3 text-gray-600">
          {t("invitedToWorkspace")}{" "}
          <strong>{invite.workspace_name}</strong>.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {t("inviteSentTo")} <strong>{invite.email}</strong>.
        </p>
        <p className="mt-6 text-sm text-gray-600">
          {t("completeRegistrationHint")}
        </p>
        <Link href={signupUrl}>
          <Button className="mt-4">{t("completeRegistration")}</Button>
        </Link>
        <p className="mt-6 text-sm text-gray-500">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href={`/login?next=${encodeURIComponent(`/dashboard/invite/${token}`)}`}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {t("logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
