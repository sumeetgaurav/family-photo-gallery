"use client";

import { useTransition } from "react";
import { signOutVisitor } from "@/app/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutVisitor())}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
