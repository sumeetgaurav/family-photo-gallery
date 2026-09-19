"use client";

import { useEffect, useState } from "react";

// Ticks every second. The very first render's timestamp necessarily differs
// between the server render and the client hydration pass (time has moved
// on), so each field carries suppressHydrationWarning — the standard pattern
// for clocks — instead of forcing an extra "not mounted yet" render.
export function CurrentDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right text-sm text-black">
      <p suppressHydrationWarning>
        {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
      <p className="tabular-nums" suppressHydrationWarning>
        {now.toLocaleTimeString()}
      </p>
    </div>
  );
}
