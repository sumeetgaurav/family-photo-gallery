import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/admin/LoginForm";

// Reads the admin's auth cookie on every request — never static.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <LoginForm />
    </div>
  );
}
