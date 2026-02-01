import Link from "next/link";
import { notFound } from "next/navigation";
import { getDecisionById } from "@/lib/queries/decisions";
import { getProjects } from "@/lib/queries/projects";
import { DecisionForm } from "@/components/decisions/decision-form";
import { updateDecisionAction, deleteDecisionAction } from "../../actions";
import { DeleteDecisionButton } from "./delete-button";

interface EditDecisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDecisionPage({ params }: EditDecisionPageProps) {
  const { id } = await params;
  const [decision, projects] = await Promise.all([
    getDecisionById(id),
    getProjects(),
  ]);

  if (!decision) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/decisions/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna alla decisione
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Modifica decisione
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <DecisionForm
          decision={decision}
          projects={projects}
          action={updateDecisionAction}
          submitLabel="Salva modifiche"
        />
      </div>

      {/* Danger zone */}
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-medium text-red-800">Zona pericolosa</h3>
        <p className="mt-1 text-sm text-red-600">
          Eliminando questa decisione, tutti i dati associati verranno persi
          definitivamente.
        </p>
        <DeleteDecisionButton decisionId={id} decisionTitle={decision.title} />
      </div>
    </div>
  );
}
