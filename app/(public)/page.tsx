import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Decern
        </h1>
        <p className="mt-6 text-xl leading-8 text-gray-600">
          Il registro delle decisioni tecniche del tuo team.
          <br />
          Documenta, condividi e traccia le scelte architetturali che contano.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          {user ? (
            <Link href="/dashboard">
              <Button size="lg">Entra</Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg">Sign up</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features section */}
      <section className="mx-auto mt-24 max-w-5xl px-4">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Documenta le decisioni
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Registra il contesto, le opzioni valutate e le conseguenze di ogni
              decisione tecnica.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Organizza per progetto
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Raggruppa le decisioni per progetto e mantieni tutto ordinato e
              accessibile.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Condividi col team
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Collabora con il tuo team e mantieni tutti allineati sulle scelte
              fatte.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
