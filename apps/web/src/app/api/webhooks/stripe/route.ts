import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { headers } from "next/headers";
import { db } from "@todouss/db";
import { Plan, SubscriptionStatus } from "@todouss/db";
import { getStripe, priceIdToPlan } from "@/lib/stripe/server";

export const runtime = "nodejs";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}

async function resolveWorkspaceId(sub: Stripe.Subscription): Promise<string | undefined> {
  const fromMeta = sub.metadata["workspaceId"];
  if (fromMeta) return fromMeta;

  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { workspaceId: true },
  });
  return existing?.workspaceId;
}

async function syncSubscriptionRecord(sub: Stripe.Subscription) {
  const resolvedWorkspaceId = await resolveWorkspaceId(sub);

  if (!resolvedWorkspaceId) {
    console.warn("Stripe subscription missing workspace link", sub.id);
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const quantity = item?.quantity ?? 1;

  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    await db.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { workspaceId: resolvedWorkspaceId },
        data: {
          status: "CANCELLED",
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          plan: "FREE",
        },
      });
      await tx.workspace.update({
        where: { id: resolvedWorkspaceId },
        data: { plan: "FREE" },
      });
    });
    return;
  }

  const mapped = priceIdToPlan(priceId ?? undefined);
  const workspacePlan: Plan = mapped ?? "PRO";
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
  const status = mapStripeStatus(sub.status);

  await db.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { workspaceId: resolvedWorkspaceId },
      create: {
        workspaceId: resolvedWorkspaceId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan: workspacePlan,
        status,
        stripeCurrentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        seats: quantity,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan: workspacePlan,
        status,
        stripeCurrentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        seats: quantity,
      },
    });
    await tx.workspace.update({
      where: { id: resolvedWorkspaceId },
      data: { plan: workspacePlan },
    });
  });
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.["workspaceId"] ?? session.client_reference_id ?? undefined;
  const subId = session.subscription;
  if (!workspaceId || typeof subId !== "string") return;

  const stripe = getStripe();
  let sub = await stripe.subscriptions.retrieve(subId);
  if (!sub.metadata["workspaceId"]) {
    await stripe.subscriptions.update(subId, { metadata: { workspaceId } });
    sub = await stripe.subscriptions.retrieve(subId);
  }
  await syncSubscriptionRecord(sub);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await req.text();
  const h = await headers();
  const sig = h.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutSession(session);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionRecord(sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
