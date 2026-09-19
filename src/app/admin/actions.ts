"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin";

export type LoginState = { error?: string } | undefined;

export async function signInAdmin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function approveRequest(requestId: string) {
  const { userId } = await verifyAdminSession();
  const supabase = getAdminClient();

  await supabase
    .from("access_requests")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: userId })
    .eq("id", requestId)
    .eq("status", "pending");

  revalidatePath("/admin");
}

export async function denyRequest(requestId: string) {
  const { userId } = await verifyAdminSession();
  const supabase = getAdminClient();

  await supabase
    .from("access_requests")
    .update({ status: "denied", decided_at: new Date().toISOString(), decided_by: userId })
    .eq("id", requestId)
    .eq("status", "pending");

  revalidatePath("/admin");
}

export async function revokeDevice(deviceId: string) {
  await verifyAdminSession();
  const supabase = getAdminClient();

  await supabase
    .from("approved_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", deviceId)
    .is("revoked_at", null);

  revalidatePath("/admin");
}
