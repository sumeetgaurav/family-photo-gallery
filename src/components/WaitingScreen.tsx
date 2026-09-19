"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pollAccessStatus } from "@/app/actions";

const POLL_INTERVAL_MS = 3000;

export function WaitingScreen() {
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    async function tick() {
      if (stoppedRef.current) return;
      const status = await pollAccessStatus();

      if (status.state === "approved") {
        stoppedRef.current = true;
        router.push("/gallery");
        return;
      }

      if (status.state === "denied") {
        stoppedRef.current = true;
        setDenied(true);
        return;
      }
    }

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      stoppedRef.current = true;
      clearInterval(interval);
    };
  }, [router]);

  if (denied) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Request denied</h1>
        <p className="mt-2 text-sm text-stone-600">
          The admin didn&apos;t approve this request. Reload the page if you&apos;d like to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Waiting for approval</h1>
      <p className="mt-2 text-sm text-stone-600">
        An admin has been notified. This page will move on by itself once you&apos;re approved.
      </p>
    </div>
  );
}
