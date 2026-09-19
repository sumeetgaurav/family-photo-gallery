import { verifyAdminSession } from "@/lib/auth/admin";
import { listGalleryPhotos } from "@/lib/photos";
import { PhotoUploadForm } from "@/components/admin/PhotoUploadForm";
import { AdminPhotoGrid } from "@/components/admin/AdminPhotoGrid";

export default async function AdminPhotosPage() {
  await verifyAdminSession();
  const photos = await listGalleryPhotos();

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Upload a photo</h1>
        <div className="mt-4">
          <PhotoUploadForm />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">
          Photos ({photos.length})
        </h2>
        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No photos yet.</p>
        ) : (
          <div className="mt-4">
            <AdminPhotoGrid photos={photos} />
          </div>
        )}
      </section>
    </div>
  );
}
