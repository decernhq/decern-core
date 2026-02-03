import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/lib/queries/project-members";
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

  const invite = await getInvitationByToken(inviteToken);
  if (!invite) {
    notFound();
  }

  const userEmail = user?.email?.toLowerCase() ?? null;
  const emailMatches = userEmail === invite.email.toLowerCase();

  const content = !user ? (
    <>
      <p className="mt-6 text-sm text-gray-600">
        Accedi con l&apos;account corretto per accettare l&apos;invito.
      </p>
      <Link href={`/login?next=${encodeURIComponent(`/dashboard/invite/${inviteToken}`)}`}>
        <Button className="mt-4">Accedi</Button>
      </Link>
    </>
  ) : !emailMatches ? (
    <>
      <p className="mt-6 text-sm text-amber-700">
        Stai accedendo con un altro account. Per accettare questo invito accedi con{" "}
        <strong>{invite.email}</strong>.
      </p>
      <Link href={`/login?next=${encodeURIComponent(`/dashboard/invite/${inviteToken}`)}`}>
        <Button variant="outline" className="mt-4">
          Cambia account
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
        <h1 className="text-xl font-semibold text-gray-900">Invito al progetto</h1>
        <p className="mt-3 text-gray-600">
          Sei stato invitato a unirti al progetto <strong>{invite.project_name}</strong>.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          L&apos;invito è stato inviato a <strong>{invite.email}</strong>.
        </p>
        {content}
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
