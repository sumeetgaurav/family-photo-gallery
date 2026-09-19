"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { nameRequestSchema } from "@/lib/validation";
import { isRateLimited } from "@/lib/rate-limit";
import {
  setPendingRequestCookie,
  readVisitorStatus,
  pollAndUpgradeIfApproved,
  mintApprovedSession,
  clearSessionCookie,
} from "@/lib/auth/visitor";

export type NameRequestState = { error?: string } | undefined;

/**
 * Form action behind the name/email-entry gate. This is the one endpoint an
 * anonymous stranger can reach, so it's rate-limited per IP.
 *
 * Identity is keyed by email (one row per email in access_requests, unique
 * on lower(email)): a returning visitor who already has an approved,
 * non-revoked device skips admin approval entirely — their browser gets a
 * session cookie immediately. A denied or fully-revoked email goes back
 * into the pending queue and needs the admin to approve it again.
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

  const parsed = nameRequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid name and email." };
  }

  const { name, email } = parsed.data;
  const deviceCookieId = randomBytes(16).toString("hex");
  const supabase = getAdminClient();

  // `email` is already lowercased by nameRequestSchema, matching how every
  // row's email is stored, so this is an exact (not pattern) match — using
  // `ilike` here would treat `_`/`%` in the address as wildcards.
  const { data: existingRequest } = await supabase
    .from("access_requests")
    .select("id, status, name, device_cookie_id")
    .eq("email", email)
    .maybeSingle();

  if (!existingRequest) {
    const { data, error } = await supabase
      .from("access_requests")
      .insert({ name, email, device_cookie_id: deviceCookieId })
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "submitNameRequest: insert failed",
        JSON.stringify({
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        })
      );
      return { error: "Something went wrong submitting your request. Please try again." };
    }

    await setPendingRequestCookie(data.id, deviceCookieId);
    return undefined;
  }

  if (existingRequest.status === "pending") {
    // Someone else's browser (or the same visitor, a different device)
    // already has this email queued — attach to that same request rather
    // than clobbering its device_cookie_id, which would break the other
    // browser's ability to poll for the decision.
    if (name !== existingRequest.name) {
      await supabase.from("access_requests").update({ name }).eq("id", existingRequest.id);
    }
    await setPendingRequestCookie(existingRequest.id, existingRequest.device_cookie_id);
    return undefined;
  }

  if (existingRequest.status === "approved") {
    const { count } = await supabase
      .from("approved_devices")
      .select("id", { count: "exact", head: true })
      .eq("access_request_id", existingRequest.id)
      .is("revoked_at", null);

    if (count && count > 0) {
      // Already approved on at least one active device — no re-approval
      // needed, just extend that approval to this browser.
      if (name !== existingRequest.name) {
        await supabase.from("access_requests").update({ name }).eq("id", existingRequest.id);
      }
      await mintApprovedSession({ id: existingRequest.id, name });
      return undefined;
    }
  }

  // Denied, or approved with every device revoked: needs a fresh decision.
  const { error: resetError } = await supabase
    .from("access_requests")
    .update({
      name,
      status: "pending",
      device_cookie_id: deviceCookieId,
      decided_at: null,
      decided_by: null,
    })
    .eq("id", existingRequest.id);

  if (resetError) {
    console.error("submitNameRequest: reset-to-pending failed", resetError);
    return { error: "Something went wrong submitting your request. Please try again." };
  }

  await setPendingRequestCookie(existingRequest.id, deviceCookieId);
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

/**
 * Signs the visitor out of this browser only — clears the session cookie,
 * leaving their approved_devices row (and admin's approval) untouched. If
 * they submit the same email again on this device, they're re-approved
 * instantly since the device itself was never revoked; only an admin revoke
 * or deny actually forces a new approval.
 */
export async function signOutVisitor() {
  await clearSessionCookie();
  redirect("/");
}
