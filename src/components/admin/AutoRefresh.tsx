"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current Server Component tree on an interval, so the
 * admin dashboard picks up requests submitted by other visitors without a
 * manual reload. A simplification versus wiring up Supabase Realtime
 * end-to-end — see CLAUDE.md.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
