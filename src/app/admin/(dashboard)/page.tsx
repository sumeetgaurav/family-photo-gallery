import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { approveRequest, denyRequest, revokeAccess } from "@/app/admin/actions";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { formatIST } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";

export default async function AdminRequestsPage() {
  await verifyAdminSession();
  const supabase = getAdminClient();

  const [{ data: pending }, { data: approved }, { data: activeDevices }] = await Promise.all([
    supabase
      .from("access_requests")
      .select("id, name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("access_requests")
      .select("id, name, email, decided_at, visit_count, last_visited_at, last_user_agent")
      .eq("status", "approved")
      .order("last_visited_at", { ascending: false, nullsFirst: false }),
    supabase.from("approved_devices").select("access_request_id").is("revoked_at", null),
  ]);

  // A request is only "currently approved" if it still has at least one
  // non-revoked device — see submitNameRequest in src/app/actions.ts, which
  // treats zero active devices the same as a full revoke.
  const activeRequestIds = new Set((activeDevices ?? []).map((d) => d.access_request_id));
  const approvedVisitors = (approved ?? []).filter((request) => activeRequestIds.has(request.id));

  return (
    <div className="flex flex-col gap-10">
      <AutoRefresh intervalMs={5000} />

      <section>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Pending requests</h1>
        {!pending || pending.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No one is waiting right now.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {pending.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900">{request.name}</p>
                  <p className="text-xs text-stone-500">{request.email}</p>
                  <p className="text-xs text-stone-500">Requested {formatIST(request.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveRequest.bind(null, request.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={denyRequest.bind(null, request.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Deny
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">Approved visitors</h2>
        {approvedVisitors.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No one has active access yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {approvedVisitors.map((visitor) => (
              <li
                key={visitor.id}
                className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900">{visitor.name}</p>
                  <p className="text-xs text-stone-500">{visitor.email}</p>
                  <p className="text-xs text-stone-500">
                    {visitor.visit_count} {visitor.visit_count === 1 ? "visit" : "visits"} · last visited{" "}
                    {formatIST(visitor.last_visited_at)}
                  </p>
                  <p className="text-xs text-stone-500" title={visitor.last_user_agent ?? undefined}>
                    Last device: {describeUserAgent(visitor.last_user_agent)}
                  </p>
                  <p className="text-xs text-stone-500">Approved {formatIST(visitor.decided_at)}</p>
                </div>
                <form action={revokeAccess.bind(null, visitor.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
