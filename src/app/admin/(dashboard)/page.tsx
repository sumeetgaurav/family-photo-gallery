import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { approveRequest, denyRequest, revokeDevice } from "@/app/admin/actions";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export default async function AdminRequestsPage() {
  await verifyAdminSession();
  const supabase = getAdminClient();

  const [{ data: pending }, { data: devices }] = await Promise.all([
    supabase
      .from("access_requests")
      .select("id, name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("approved_devices")
      .select("id, access_request_id, created_at, revoked_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const requestIds = (devices ?? []).map((device) => device.access_request_id);
  const { data: approvedRequests } =
    requestIds.length > 0
      ? await supabase.from("access_requests").select("id, name, email").in("id", requestIds)
      : { data: [] as { id: string; name: string; email: string }[] };

  const requestById = new Map((approvedRequests ?? []).map((r) => [r.id, r]));

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
                  <p className="text-xs text-stone-500">
                    Requested {new Date(request.created_at).toLocaleString()}
                  </p>
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
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">Approved devices</h2>
        {!devices || devices.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No approved devices yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {requestById.get(device.access_request_id)?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {requestById.get(device.access_request_id)?.email ?? ""}
                  </p>
                  <p className="text-xs text-stone-500">
                    Approved {new Date(device.created_at).toLocaleString()}
                  </p>
                </div>
                <form action={revokeDevice.bind(null, device.id)}>
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
