"use client";

import { useActionState } from "react";
import { submitNameRequest, type NameRequestState } from "@/app/actions";

export function NameGateForm({ heading }: { heading?: string }) {
  const [state, action, pending] = useActionState<NameRequestState, FormData>(
    submitNameRequest,
    undefined
  );

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        {heading ?? "Family Gallery"}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        This gallery is private. Enter your name and an admin will let you in.
      </p>

      <form action={action} className="mt-6 flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium text-stone-700">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          placeholder="e.g. Priya"
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />

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
          {pending ? "Requesting..." : "Ask to view the gallery"}
        </button>
      </form>
    </div>
  );
}
