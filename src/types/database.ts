export type AccessRequestStatus = "pending" | "approved" | "denied";

// Supabase's generated Database type requires plain object types here, not
// interfaces — an `interface` has no implicit index signature, so it fails
// the library's internal `Record<string, unknown>` constraint and every
// query silently degrades to `never`. Keep these as `type`.
export type AccessRequestRow = {
  id: string;
  name: string;
  status: AccessRequestStatus;
  device_cookie_id: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

export type ApprovedDeviceRow = {
  id: string;
  access_request_id: string;
  token_hash: string;
  created_at: string;
  revoked_at: string | null;
};

export type AlbumRow = {
  id: string;
  name: string;
  cover_photo_id: string | null;
  created_at: string;
};

export type PhotoRow = {
  id: string;
  album_id: string | null;
  storage_path: string;
  thumbnail_path: string;
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
};

export type Database = {
  public: {
    Tables: {
      access_requests: {
        Row: AccessRequestRow;
        Insert: Partial<AccessRequestRow> &
          Pick<AccessRequestRow, "name" | "device_cookie_id">;
        Update: Partial<AccessRequestRow>;
        Relationships: [];
      };
      approved_devices: {
        Row: ApprovedDeviceRow;
        Insert: Partial<ApprovedDeviceRow> &
          Pick<ApprovedDeviceRow, "access_request_id" | "token_hash">;
        Update: Partial<ApprovedDeviceRow>;
        Relationships: [];
      };
      albums: {
        Row: AlbumRow;
        Insert: Partial<AlbumRow> & Pick<AlbumRow, "name">;
        Update: Partial<AlbumRow>;
        Relationships: [];
      };
      photos: {
        Row: PhotoRow;
        Insert: Partial<PhotoRow> &
          Pick<PhotoRow, "storage_path" | "thumbnail_path">;
        Update: Partial<PhotoRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
