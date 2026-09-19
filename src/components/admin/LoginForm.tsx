"use client";

import { useActionState } from "react";
import { signInAdmin, type LoginState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInAdmin, undefined);

  return (
    <form action={action} className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Admin sign in</h1>
      <p className="mt-2 text-sm text-stone-600">Manage access requests and the photo gallery.</p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
