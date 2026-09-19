import { redirect } from "next/navigation";
import { readVisitorStatus } from "@/lib/auth/visitor";
import { NameGateForm } from "@/components/NameGateForm";
import { WaitingScreen } from "@/components/WaitingScreen";

// Every visitor's status is unique to their cookies — never statically cache this.
export const dynamic = "force-dynamic";

export default async function Home() {
  const status = await readVisitorStatus();

  if (status.state === "approved") {
    redirect("/gallery");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      {status.state === "anonymous" ? (
        <NameGateForm />
      ) : status.state === "denied" ? (
        <div className="w-full max-w-sm">
          <WaitingScreenDeniedFallback />
        </div>
      ) : (
        <WaitingScreen />
      )}
    </div>
  );
}

// The waiting screen itself detects "denied" via polling. This covers the
// case where a visitor reloads the page after already being denied, so the
// server-rendered state matches without waiting for the first poll.
function WaitingScreenDeniedFallback() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Request denied</h1>
      <p className="mt-2 text-sm text-stone-600">
        The admin didn&apos;t approve this request.
      </p>
      <div className="mt-6">
        <NameGateForm heading="Ask again" />
      </div>
    </div>
  );
}
