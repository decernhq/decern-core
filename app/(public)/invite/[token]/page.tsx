import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceInvitationByToken } from "@/lib/queries/workspaces";
import { Button } from "@/components/ui/button";

interface PublicInvitePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Pagina pubblica per il link invito al workspace. Se l'utente non è loggato mostra
 * "Completa registrazione con [email]"; se è loggato reindirizza alla pagina
 * dashboard per accettare l'invito.
 */
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

  const signupUrl = `/signup?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Invito al workspace</h1>
        <p className="mt-3 text-gray-600">
          Sei stato invitato a unirti al workspace{" "}
          <strong>{invite.workspace_name}</strong>.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          L&apos;invito è stato inviato a <strong>{invite.email}</strong>.
        </p>
        <p className="mt-6 text-sm text-gray-600">
          Completa la registrazione con questa email per unirti al workspace.
          Dopo la registrazione vedrai tutti i progetti del workspace nella tua lista.
        </p>
        <Link href={signupUrl}>
          <Button className="mt-4">Completa registrazione</Button>
        </Link>
        <p className="mt-6 text-sm text-gray-500">
          Hai già un account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(`/dashboard/invite/${token}`)}`}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
