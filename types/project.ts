/**
 * A project that contains multiple decisions.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new project.
 */
export type CreateProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
