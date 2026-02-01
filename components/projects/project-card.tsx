import Link from "next/link";
import type { Project } from "@/types/database";

interface ProjectCardProps {
  project: Project;
  decisionCount?: number;
}

export function ProjectCard({ project, decisionCount = 0 }: ProjectCardProps) {
  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
          {project.description}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {decisionCount} {decisionCount === 1 ? "decisione" : "decisioni"}
        </span>
        <span className="text-gray-400">
          {new Date(project.created_at).toLocaleDateString("it-IT")}
        </span>
      </div>
    </Link>
  );
}
