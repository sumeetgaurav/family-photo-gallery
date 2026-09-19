import type { GalleryPhoto } from "@/lib/photos";
import { updatePhotoCaption, deletePhoto } from "@/app/admin/photos-actions";

export function AdminPhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <div key={photo.id} className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-3">
          <div className="aspect-square overflow-hidden rounded-md bg-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption ?? "Family photo"}
              className="h-full w-full object-cover object-top"
            />
          </div>

          <form action={updatePhotoCaption.bind(null, photo.id)} className="flex gap-2">
            <input
              type="text"
              name="caption"
              defaultValue={photo.caption ?? ""}
              placeholder="Add a caption"
              maxLength={280}
              className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Save
            </button>
          </form>

          <form action={deletePhoto.bind(null, photo.id)}>
            <button
              type="submit"
              className="w-full rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
