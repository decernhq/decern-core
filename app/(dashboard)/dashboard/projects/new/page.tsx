import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../actions";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna ai progetti
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuovo progetto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea un nuovo progetto per organizzare le tue decisioni tecniche.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm action={createProjectAction} submitLabel="Crea progetto" />
      </div>
    </div>
  );
}
