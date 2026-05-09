import "server-only";
import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, { typescript: true });
}

export function getStripeProPriceId(): string {
  const id = process.env["STRIPE_PRO_PRICE_ID"];
  if (!id) throw new Error("STRIPE_PRO_PRICE_ID is not set");
  return id;
}

export function getStripeBusinessPriceId(): string {
  const id = process.env["STRIPE_BUSINESS_PRICE_ID"];
  if (!id) throw new Error("STRIPE_BUSINESS_PRICE_ID is not set");
  return id;
}

export function priceIdToPlan(priceId: string | null | undefined): "PRO" | "BUSINESS" | null {
  if (!priceId) return null;
  try {
    if (priceId === getStripeProPriceId()) return "PRO";
    if (priceId === getStripeBusinessPriceId()) return "BUSINESS";
  } catch {
    return null;
  }
  return null;
}
