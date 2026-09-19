"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminClient, getStorageBucket } from "@/lib/supabase/admin";
import { generateThumbnail, extensionForMimeType } from "@/lib/photos";
import { photoUploadSchema, ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/validation";

export type UploadPhotoState = { error?: string } | undefined;

export async function uploadPhoto(
  _prevState: UploadPhotoState,
  formData: FormData
): Promise<UploadPhotoState> {
  const { userId } = await verifyAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { error: "Only JPEG, PNG, or WebP photos are supported." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That photo is larger than 25MB." };
  }

  const parsed = photoUploadSchema.safeParse({
    caption: formData.get("caption") ?? undefined,
    albumId: formData.get("albumId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());

  let thumbnailBuffer: Buffer;
  try {
    thumbnailBuffer = await generateThumbnail(originalBuffer);
  } catch {
    return { error: "That file doesn't look like a valid image." };
  }

  const id = randomUUID();
  const extension = extensionForMimeType(file.type);
  const storagePath = `originals/${id}.${extension}`;
  const thumbnailPath = `thumbnails/${id}.webp`;

  const supabase = getAdminClient();
  const bucket = supabase.storage.from(getStorageBucket());

  const [originalUpload, thumbnailUpload] = await Promise.all([
    bucket.upload(storagePath, originalBuffer, { contentType: file.type, upsert: false }),
    bucket.upload(thumbnailPath, thumbnailBuffer, { contentType: "image/webp", upsert: false }),
  ]);

  if (originalUpload.error || thumbnailUpload.error) {
    const uploadedPaths = [
      originalUpload.error ? null : storagePath,
      thumbnailUpload.error ? null : thumbnailPath,
    ].filter((path): path is string => path !== null);
    if (uploadedPaths.length > 0) {
      await bucket.remove(uploadedPaths);
    }
    return { error: "Upload to storage failed. Please try again." };
  }

  const { error: insertError } = await supabase.from("photos").insert({
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    caption: parsed.data.caption || null,
    album_id: parsed.data.albumId || null,
    uploaded_by: userId,
  });

  if (insertError) {
    await bucket.remove([storagePath, thumbnailPath]);
    return { error: "Saving the photo record failed. Please try again." };
  }

  revalidatePath("/admin/photos");
  revalidatePath("/gallery");
  return undefined;
}

export async function updatePhotoCaption(photoId: string, formData: FormData) {
  await verifyAdminSession();

  const parsed = photoUploadSchema.shape.caption.safeParse(formData.get("caption") ?? undefined);
  if (!parsed.success) {
    return;
  }

  const supabase = getAdminClient();

  await supabase
    .from("photos")
    .update({ caption: parsed.data || null })
    .eq("id", photoId);

  revalidatePath("/admin/photos");
  revalidatePath("/gallery");
}

export async function deletePhoto(photoId: string) {
  await verifyAdminSession();
  const supabase = getAdminClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path, thumbnail_path")
    .eq("id", photoId)
    .maybeSingle();

  if (photo) {
    await supabase.storage.from(getStorageBucket()).remove([photo.storage_path, photo.thumbnail_path]);
  }

  await supabase.from("photos").delete().eq("id", photoId);

  revalidatePath("/admin/photos");
  revalidatePath("/gallery");
}
