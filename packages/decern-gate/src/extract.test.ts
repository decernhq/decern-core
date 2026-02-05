import { describe, it, expect } from "vitest";
import { extractDecisionIds } from "./main";

describe("extractDecisionIds", () => {
  it("extracts decern:<id>", () => {
    expect(extractDecisionIds("Fix stuff decern:550e8400-e29b-41d4-a716-446655440000")).toEqual([
      "550e8400-e29b-41d4-a716-446655440000",
    ]);
  });

  it("extracts DECERN-<id>", () => {
    expect(extractDecisionIds("DECERN-123 and DECERN-456")).toEqual(["123", "456"]);
  });

  it("extracts from URL /decisions/<id>", () => {
    expect(
      extractDecisionIds("See https://app.example.com/dashboard/decisions/abc-123-def")
    ).toEqual(["abc-123-def"]);
  });

  it("deduplicates and preserves order of first occurrence", () => {
    const text = "decern:id1 DECERN-id1 /decisions/id1";
    const ids = extractDecisionIds(text);
    expect(ids).toContain("id1");
    expect(ids.length).toBe(1);
  });

  it("returns empty array for empty or non-string", () => {
    expect(extractDecisionIds("")).toEqual([]);
    expect(extractDecisionIds((null as unknown) as string)).toEqual([]);
  });

  it("extracts multiple different ids", () => {
    const text = "decern:first and DECERN-second";
    const ids = extractDecisionIds(text);
    expect(ids).toContain("first");
    expect(ids).toContain("second");
    expect(ids.length).toBe(2);
  });
});
