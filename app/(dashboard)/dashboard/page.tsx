import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/queries/decisions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    stats,
  ] = await Promise.all([supabase.auth.getUser(), getDashboardStats()]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Benvenuto in Decern
        </h1>
        <p className="mt-2 text-gray-600">
          Ciao, <span className="font-medium">{user?.email}</span>!
        </p>
        <p className="mt-4 text-gray-600">
          Inizia a documentare le decisioni tecniche del tuo team.
        </p>

        {/* Quick stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Progetti</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.totalProjects}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Decisioni</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.totalDecisions}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-600">Proposte</p>
            <p className="mt-1 text-2xl font-semibold text-yellow-900">
              {stats.proposed}
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-600">Approvate</p>
            <p className="mt-1 text-2xl font-semibold text-green-900">
              {stats.approved}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Azioni rapide</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/projects/new">
              <Button>+ Nuovo progetto</Button>
            </Link>
            {stats.totalProjects > 0 && (
              <Link href="/dashboard/decisions/new">
                <Button variant="outline">+ Nuova decisione</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Getting started guide (show if no projects) */}
      {stats.totalProjects === 0 && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-6">
          <h2 className="text-lg font-semibold text-brand-900">Come iniziare</h2>
          <ol className="mt-4 space-y-3 text-sm text-brand-800">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                1
              </span>
              <span>
                <strong>Crea un progetto</strong> - Ogni progetto raggruppa le
                decisioni relative a un&apos;applicazione o servizio.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                2
              </span>
              <span>
                <strong>Documenta una decisione</strong> - Descrivi il contesto,
                le opzioni valutate e la decisione finale.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                3
              </span>
              <span>
                <strong>Condividi col team</strong> - Le decisioni documentate
                aiutano tutti a capire il &quot;perché&quot; dietro le scelte tecniche.
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
