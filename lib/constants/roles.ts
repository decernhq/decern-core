/**
 * Ruoli utente disponibili in registrazione e impostazioni.
 * Ordinati per categoria (tecnico, product, design, altro).
 */
export const USER_ROLES = [
  "Sviluppatore frontend",
  "Sviluppatore backend",
  "Sviluppatore full-stack",
  "Tech Lead",
  "Software Architect",
  "Engineering Manager",
  "Product Manager",
  "Product Owner",
  "Designer UX/UI",
  "Designer",
  "QA / Quality Assurance",
  "DevOps / SRE",
  "Data Engineer",
  "Data Scientist",
  "Altro",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isValidRole(value: string | null | undefined): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
