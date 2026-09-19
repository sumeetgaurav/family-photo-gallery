import "server-only";
import sharp from "sharp";
import { getAdminClient, getStorageBucket } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — regenerated on every gallery render

export interface GalleryPhoto {
  id: string;
  caption: string | null;
  albumId: string | null;
  uploadedAt: string;
  url: string;
  thumbnailUrl: string;
}

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  const supabase = getAdminClient();
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, thumbnail_path, caption, album_id, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (error || !photos) return [];

  const bucket = supabase.storage.from(getStorageBucket());

  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      const [original, thumbnail] = await Promise.all([
        bucket.createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS),
        bucket.createSignedUrl(photo.thumbnail_path, SIGNED_URL_TTL_SECONDS),
      ]);

      return {
        id: photo.id,
        caption: photo.caption,
        albumId: photo.album_id,
        uploadedAt: photo.uploaded_at,
        url: original.data?.signedUrl ?? "",
        thumbnailUrl: thumbnail.data?.signedUrl ?? "",
      };
    })
  );

  return withUrls.filter((photo) => photo.url && photo.thumbnailUrl);
}

const THUMBNAIL_WIDTH = 480;

export async function generateThumbnail(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .rotate() // apply EXIF orientation before resizing
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}
