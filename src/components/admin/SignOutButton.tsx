"use client";

import { useTransition } from "react";
import { signOutAdmin } from "@/app/admin/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutAdmin())}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
