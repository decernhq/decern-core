import { describe, it, expect } from "vitest";
import { isDecisionRequired } from "./main";

describe("isDecisionRequired", () => {
  it("returns NOT REQUIRED when no files match", () => {
    const r = isDecisionRequired(["src/foo.ts", "README.md"]);
    expect(r.required).toBe(false);
    expect(r.reason).toContain("No high-impact");
  });

  it("returns REQUIRED when migrations match", () => {
    const r = isDecisionRequired(["src/foo.ts", "supabase/migrations/00001_init.sql"]);
    expect(r.required).toBe(true);
    expect(r.reason).toContain("migrations");
  });

  it("returns REQUIRED when prisma migrations match", () => {
    const r = isDecisionRequired(["prisma/migrations/20240101_init/migration.sql"]);
    expect(r.required).toBe(true);
  });

  it("returns REQUIRED when Dockerfile matches", () => {
    const r = isDecisionRequired(["Dockerfile"]);
    expect(r.required).toBe(true);
  });

  it("returns REQUIRED when package.json matches", () => {
    const r = isDecisionRequired(["package.json"]);
    expect(r.required).toBe(true);
  });

  it("returns REQUIRED when workflow file matches", () => {
    const r = isDecisionRequired([".github/workflows/ci.yml"]);
    expect(r.required).toBe(true);
  });

  it("returns REQUIRED when go.mod matches", () => {
    const r = isDecisionRequired(["go.mod"]);
    expect(r.required).toBe(true);
  });

  it("returns NOT REQUIRED for empty list", () => {
    const r = isDecisionRequired([]);
    expect(r.required).toBe(false);
  });

  it("returns REQUIRED for openapi/swagger basenames only", () => {
    expect(isDecisionRequired(["openapi.yaml"]).required).toBe(true);
    expect(isDecisionRequired(["api/openapi.yml"]).required).toBe(true);
    expect(isDecisionRequired(["swagger.json"]).required).toBe(true);
    expect(isDecisionRequired(["docs/openapi.something"]).required).toBe(false);
  });
});
