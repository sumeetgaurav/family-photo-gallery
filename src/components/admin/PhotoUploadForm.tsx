"use client";

import { useActionState, useRef } from "react";
import { uploadPhoto, type UploadPhotoState } from "@/app/admin/photos-actions";

export function PhotoUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function action(prevState: UploadPhotoState, formData: FormData) {
    const result = await uploadPhoto(prevState, formData);
    if (!result?.error) {
      formRef.current?.reset();
    }
    return result;
  }

  const [state, formAction, pending] = useActionState<UploadPhotoState, FormData>(action, undefined);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-lg flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium text-stone-700">
          Photo
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-300"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="caption" className="text-sm font-medium text-stone-700">
          Caption (optional)
        </label>
        <input
          id="caption"
          name="caption"
          type="text"
          maxLength={280}
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Uploading..." : "Upload photo"}
      </button>
    </form>
  );
}
