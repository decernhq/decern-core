import { describe, it, expect, vi, beforeEach } from "vitest";
import { billJudgeUsageForPeriod } from "./judge-billing";

const mockFrom = vi.fn();
const mockStripeInvoiceItemsCreate = vi.fn();
const mockStripeInvoicesCreate = vi.fn();
const mockStripeInvoicesFinalize = vi.fn();

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => mockFrom(table),
    rpc: vi.fn(),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    invoiceItems: { create: (args: unknown) => mockStripeInvoiceItemsCreate(args) },
    invoices: {
      create: (args: unknown) => mockStripeInvoicesCreate(args),
      finalizeInvoice: (id: string) => mockStripeInvoicesFinalize(id),
    },
  },
}));

function chain<T>(res: T) {
  return {
    select: () => chain(res),
    eq: () => chain(res),
    is: () => chain(res),
    in: () => chain(res),
    update: () => chain(res),
    maybeSingle: () => Promise.resolve(res),
    then: (resolve: (v: { data: T }) => void) => Promise.resolve(res).then((d) => resolve({ data: d })),
  };
}

describe("billJudgeUsageForPeriod", () => {
  const period = "2025-01";
  const workspaceA = "ws-a";
  const workspaceB = "ws-b";
  const ownerA = "owner-a";
  const ownerB = "owner-b";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "judge_usage") {
        return {
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  data: [
                    { workspace_id: workspaceA, input_tokens: 1000, output_tokens: 100 },
                    { workspace_id: workspaceB, input_tokens: 2000, output_tokens: 200 },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "workspaces") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { id: workspaceA, owner_id: ownerA },
                  { id: workspaceB, owner_id: ownerB },
                ],
                error: null,
              }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({
            in: () => ({
              not: () =>
                Promise.resolve({
                  data: [
                    { user_id: ownerA, stripe_customer_id: "cus_a" },
                    { user_id: ownerB, stripe_customer_id: "cus_b" },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      return chain({ id: workspaceA });
    });
    mockStripeInvoiceItemsCreate.mockResolvedValue({});
    mockStripeInvoicesCreate.mockResolvedValue({ id: "in_1" });
    mockStripeInvoicesFinalize.mockResolvedValue({});
  });

  it("when Stripe fails for second owner, only first is billed and only successful owner workspaces get billed_at", async () => {
    let finalizeCallCount = 0;
    mockStripeInvoicesFinalize.mockImplementation(() => {
      finalizeCallCount++;
      if (finalizeCallCount === 2) return Promise.reject(new Error("Card declined"));
      return Promise.resolve({});
    });

    let updateWorkspaceIds: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === "judge_usage") {
        return {
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  data: [
                    { workspace_id: workspaceA, input_tokens: 1000, output_tokens: 100 },
                    { workspace_id: workspaceB, input_tokens: 2000, output_tokens: 200 },
                  ],
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => ({
              in: (_k: string, ids: string[]) => {
                updateWorkspaceIds = ids;
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }
      if (table === "workspaces") {
        return {
          select: (cols: string) => ({
            in: (key: string, vals: string[]) => {
              if (key === "owner_id" && cols.includes("id")) {
                const ids = vals.includes(ownerA) && !vals.includes(ownerB) ? [workspaceA] : vals.length === 2 ? [workspaceA, workspaceB] : [workspaceA];
                return Promise.resolve({ data: ids.map((id) => ({ id })), error: null });
              }
              return Promise.resolve({
                data: [
                  { id: workspaceA, owner_id: ownerA },
                  { id: workspaceB, owner_id: ownerB },
                ],
                error: null,
              });
            },
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({
            in: () => ({
              not: () =>
                Promise.resolve({
                  data: [
                    { user_id: ownerA, stripe_customer_id: "cus_a" },
                    { user_id: ownerB, stripe_customer_id: "cus_b" },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      return chain({ id: workspaceA });
    });

    const result = await billJudgeUsageForPeriod(period);

    expect(result.billedOwners).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Card declined");
    expect(updateWorkspaceIds).toEqual([workspaceA]);
  });
});
