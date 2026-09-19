import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Verifies the admin is signed in via Supabase Auth. Redirects to the login
 * page otherwise. Call this at the top of every admin page and every admin
 * Server Action — never rely on the UI (nav links, hidden buttons) alone.
 */
export const verifyAdminSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return { userId: user.id, email: user.email ?? null };
});
