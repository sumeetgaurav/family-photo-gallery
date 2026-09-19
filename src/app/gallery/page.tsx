import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { readVisitorStatus, recordGalleryVisit } from "@/lib/auth/visitor";
import { listGalleryPhotos } from "@/lib/photos";
import { GalleryGrid } from "@/components/GalleryGrid";
import { CurrentDateTime } from "@/components/CurrentDateTime";
import { SignOutButton } from "@/components/SignOutButton";

// Gated by a per-visitor cookie and signed URLs that expire — never static.
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const status = await readVisitorStatus();

  if (status.state !== "approved") {
    redirect("/");
  }

  const headerList = await headers();
  await recordGalleryVisit(status.requestId, headerList.get("user-agent"));
  const photos = await listGalleryPhotos();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Family Gallery</h1>
          <p className="mt-1 text-sm text-stone-600">Welcome, {status.name}.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CurrentDateTime />
          <SignOutButton />
        </div>
      </header>

      {photos.length === 0 ? (
        <p className="text-sm text-stone-600">No photos yet — check back soon.</p>
      ) : (
        <GalleryGrid photos={photos} />
      )}
    </div>
  );
}
