import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@todouss/db";
import type { NextRequest } from "next/server";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env["CLERK_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let evt: ClerkUserEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created") {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    )?.email_address;

    if (!primaryEmail) return new Response("No primary email", { status: 400 });

    await db.user.create({
      data: {
        clerkId: data.id,
        email: primaryEmail,
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "user.updated") {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    )?.email_address;

    await db.user.update({
      where: { clerkId: data.id },
      data: {
        ...(primaryEmail ? { email: primaryEmail } : {}),
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "user.deleted") {
    await db.user.delete({ where: { clerkId: data.id } });
  }

  return new Response("OK", { status: 200 });
}
