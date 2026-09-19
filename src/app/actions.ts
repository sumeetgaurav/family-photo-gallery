"use server";

import { randomBytes } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { nameRequestSchema } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limit";
import { setPendingRequestCookie, readVisitorStatus, pollAndUpgradeIfApproved } from "@/lib/auth/visitor";

export type NameRequestState = { error?: string } | undefined;

/**
 * Form action behind the name-entry gate. This is the one endpoint an
 * anonymous stranger can reach, so it's rate-limited per IP.
 */
export async function submitNameRequest(
  _prevState: NameRequestState,
  formData: FormData
): Promise<NameRequestState> {
  const existing = await readVisitorStatus();
  if (existing.state === "approved" || existing.state === "pending") {
    return undefined;
  }

  if (await isRateLimited("access-request", { limit: 5, windowMs: 10 * 60 * 1000 })) {
    return { error: "Too many requests from this network. Please try again in a few minutes." };
  }

  const parsed = nameRequestSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid name." };
  }

  const deviceCookieId = randomBytes(16).toString("hex");
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("access_requests")
    .insert({ name: parsed.data.name, device_cookie_id: deviceCookieId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Something went wrong submitting your request. Please try again." };
  }

  await setPendingRequestCookie(data.id, deviceCookieId);
  return undefined;
}

/**
 * Polled by the waiting screen every few seconds. Upgrades the visitor to
 * an approved session the moment admin approves, in the same round trip
 * that discovers the approval. Loosely rate-limited — the normal 3s cadence
 * is well under this, it only stops a client from hammering the DB outside
 * the intended polling loop.
 */
export async function pollAccessStatus() {
  if (await isRateLimited("poll-status", { limit: 40, windowMs: 60 * 1000 })) {
    return { state: "pending" as const };
  }
  return pollAndUpgradeIfApproved();
}
