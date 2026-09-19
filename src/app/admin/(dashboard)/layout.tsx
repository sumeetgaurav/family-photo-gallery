import Link from "next/link";
import { verifyAdminSession } from "@/lib/auth/admin";
import { SignOutButton } from "@/components/admin/SignOutButton";

// Every admin page needs a fresh session/data check — never static.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { email } = await verifyAdminSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6">
            <span className="font-semibold tracking-tight text-stone-900">Family Gallery Admin</span>
            <Link href="/admin" className="text-sm text-stone-600 hover:text-stone-900">
              Requests
            </Link>
            <Link href="/admin/photos" className="text-sm text-stone-600 hover:text-stone-900">
              Photos
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {email && <span className="text-sm text-stone-500">{email}</span>}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
