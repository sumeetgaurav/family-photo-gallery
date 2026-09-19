import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";

const PENDING_COOKIE = "gallery_pending";
const SESSION_COOKIE = "gallery_session";
const PENDING_MAX_AGE_SECONDS = 60 * 60 * 24; // a day is plenty to wait for a decision
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months of "stay approved"

export type VisitorStatus =
  | { state: "anonymous" }
  | { state: "pending" }
  | { state: "denied" }
  | { state: "approved"; name: string; deviceId: string };

function getJwtSecret() {
  const secret = process.env.VISITOR_JWT_SECRET;
  if (!secret) {
    throw new Error("VISITOR_JWT_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// ---------------------------------------------------------------------------
// Pending cookie: set right after a name is submitted, before any decision.
// Its value is the request id plus the request's own random device_cookie_id,
// so status lookups can't be guessed or enumerated.
// ---------------------------------------------------------------------------

export async function setPendingRequestCookie(requestId: string, deviceCookieId: string) {
  const store = await cookies();
  store.set(PENDING_COOKIE, `${requestId}.${deviceCookieId}`, cookieOptions(PENDING_MAX_AGE_SECONDS));
}

async function readPendingRequestCookie() {
  const store = await cookies();
  const raw = store.get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  const [requestId, deviceCookieId] = raw.split(".");
  if (!requestId || !deviceCookieId) return null;

  return { requestId, deviceCookieId };
}

export async function clearPendingRequestCookie() {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}

// ---------------------------------------------------------------------------
// Session cookie: issued once a device is approved. Carries a random secret
// whose hash is stored on the approved_devices row, so a stolen/forged
// signature alone isn't enough — the stored hash has to match too, and
// clearing revoked_at instantly cuts a device off regardless.
// ---------------------------------------------------------------------------

async function issueSessionCookie(params: {
  deviceId: string;
  requestId: string;
  name: string;
  deviceSecret: string;
}) {
  const jwt = await new SignJWT({ rid: params.requestId, name: params.name, tok: params.deviceSecret })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.deviceId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, cookieOptions(SESSION_MAX_AGE_SECONDS));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function readSessionStatus(): Promise<VisitorStatus | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    const deviceId = payload.sub;
    const tok = payload.tok;
    const name = payload.name;
    if (typeof deviceId !== "string" || typeof tok !== "string" || typeof name !== "string") {
      return null;
    }

    const supabase = getAdminClient();
    const { data } = await supabase
      .from("approved_devices")
      .select("token_hash, revoked_at")
      .eq("id", deviceId)
      .maybeSingle();

    if (!data || data.revoked_at) return null;

    const expected = Buffer.from(data.token_hash, "hex");
    const actual = Buffer.from(hashToken(tok), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    return { state: "approved", name, deviceId };
  } catch {
    return null;
  }
}

/**
 * Read-only visitor status. Safe to call from Server Components — it never
 * writes cookies (Next.js only allows cookie mutation from Server Actions
 * and Route Handlers). Use `pollAndUpgradeIfApproved` for the mutating
 * version that actually issues the session cookie once approved.
 */
export async function readVisitorStatus(): Promise<VisitorStatus> {
  const session = await readSessionStatus();
  if (session) return session;

  const pending = await readPendingRequestCookie();
  if (!pending) return { state: "anonymous" };

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("access_requests")
    .select("status")
    .eq("id", pending.requestId)
    .eq("device_cookie_id", pending.deviceCookieId)
    .maybeSingle();

  if (!data) return { state: "anonymous" };
  if (data.status === "denied") return { state: "denied" };
  // "pending" and "approved-but-not-yet-picked-up" both show the waiting
  // screen, whose polling loop calls pollAndUpgradeIfApproved to finish.
  return { state: "pending" };
}

/**
 * Mutating check, safe only from Server Actions / Route Handlers. If the
 * visitor's pending request has been approved, mints an approved_devices
 * row and issues the session cookie, then clears the pending cookie.
 */
export async function pollAndUpgradeIfApproved(): Promise<VisitorStatus> {
  const session = await readSessionStatus();
  if (session) return session;

  const pending = await readPendingRequestCookie();
  if (!pending) return { state: "anonymous" };

  const supabase = getAdminClient();
  const { data: request } = await supabase
    .from("access_requests")
    .select("id, status, name")
    .eq("id", pending.requestId)
    .eq("device_cookie_id", pending.deviceCookieId)
    .maybeSingle();

  if (!request) return { state: "anonymous" };
  if (request.status === "denied") return { state: "denied" };
  if (request.status === "pending") return { state: "pending" };

  const deviceSecret = randomBytes(32).toString("hex");
  const tokenHash = hashToken(deviceSecret);

  const { data: device, error } = await supabase
    .from("approved_devices")
    .insert({ access_request_id: request.id, token_hash: tokenHash })
    .select("id")
    .single();

  if (error || !device) {
    // Transient issue — the visitor stays on the waiting screen and the
    // next poll (a few seconds later) tries again.
    return { state: "pending" };
  }

  await issueSessionCookie({
    deviceId: device.id,
    requestId: request.id,
    name: request.name,
    deviceSecret,
  });
  await clearPendingRequestCookie();

  return { state: "approved", name: request.name, deviceId: device.id };
}
