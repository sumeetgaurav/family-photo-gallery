"use client";

import { useEffect, useRef } from "react";
import { signOutVisitor } from "@/app/actions";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;

/**
 * Logs the visitor out of the gallery after 15 minutes with no interaction
 * on the page. This is a client-side convenience (someone walking away from
 * a shared/family device) — it doesn't touch approved_devices, so it's the
 * same "local sign-out" as the manual Log out button (see signOutVisitor in
 * src/app/actions.ts). The real security boundary is still the session
 * cookie + server-side approved_devices check on every request; this just
 * makes the browser stop presenting the gallery unattended.
 */
export function IdleLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void signOutVisitor();
      }, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") resetTimer();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
