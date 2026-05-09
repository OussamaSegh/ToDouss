import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, getStripeBusinessPriceId, getStripeProPriceId } from "@/lib/stripe/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  workspaceId: z.string().cuid(),
  plan: z.enum(["PRO", "BUSINESS"]),
  seatCount: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { workspaceId, plan, seatCount = 1 } = parsed.data;

    const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: dbUser.id },
      },
      include: { workspace: true },
    });
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const slug = membership.workspace.slug;
    const stripe = getStripe();
    const priceId = plan === "PRO" ? getStripeProPriceId() : getStripeBusinessPriceId();
    const quantity = plan === "BUSINESS" ? seatCount : 1;

    const existing = await db.subscription.findUnique({ where: { workspaceId } });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: workspaceId,
      customer: existing?.stripeCustomerId ?? undefined,
      customer_email: existing?.stripeCustomerId ? undefined : dbUser.email,
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/${slug}/settings?checkout=success`,
      cancel_url: `${appUrl}/${slug}/settings?checkout=cancel`,
      metadata: { workspaceId },
      subscription_data: {
        metadata: { workspaceId },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
