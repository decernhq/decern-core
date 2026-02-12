import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

const mockRpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (body: string, sig: string, _secret: string) => mockConstructEvent(body, sig) },
    subscriptions: { retrieve: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve({ get: (name: string) => (name === "stripe-signature" ? "v1,sig" : null) })),
}));

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec-test";
    process.env.SUPABASE_WEBHOOK_SECRET = "webhook-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mockRpc.mockResolvedValue({ error: null });
  });

  it("invoice.payment_failed with Judge invoice calls stripe_webhook_judge_invoice_failed", async () => {
    const judgeInvoice = {
      id: "in_123",
      customer: "cus_judge",
      subscription: null,
      description: "Judge usage 2025-01",
    } as Stripe.Invoice;

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: judgeInvoice },
    });

    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: new Headers({ "stripe-signature": "v1,sig" }),
    });

    const { POST } = await import("./route");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("stripe_webhook_payment_failed", expect.any(Object));
    expect(mockRpc).toHaveBeenCalledWith("stripe_webhook_judge_invoice_failed", {
      p_secret: "webhook-secret",
      p_stripe_customer_id: "cus_judge",
      p_period: "2025-01",
    });
  });

  it("invoice.payment_failed with subscription invoice does not call judge RPC", async () => {
    const subInvoice = {
      id: "in_456",
      customer: "cus_sub",
      subscription: "sub_123",
      description: null,
    } as Stripe.Invoice;

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: subInvoice },
    });

    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: new Headers({ "stripe-signature": "v1,sig" }),
    });

    const { POST } = await import("./route");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("stripe_webhook_payment_failed", expect.any(Object));
    const judgeCalls = mockRpc.mock.calls.filter((c) => c[0] === "stripe_webhook_judge_invoice_failed");
    expect(judgeCalls).toHaveLength(0);
  });
});
