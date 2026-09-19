# Architecture

This document describes the planned system architecture and the end-to-end access-request/approval flow for the family photo gallery. See `CLAUDE.md` for the full plan and data model.

## System components

```mermaid
flowchart LR
    subgraph Visitor["Family member"]
        VB["Browser\n(gate page / gallery)"]
    end

    subgraph Admin["Admin"]
        AB["Browser\n(/admin dashboard)"]
    end

    subgraph Vercel["Vercel"]
        FE["Next.js frontend\n(gate, gallery, admin UI)"]
        API["Next.js API routes\n(access requests, photo CRUD, admin auth check)"]
    end

    subgraph Supabase["Supabase"]
        AUTH["Supabase Auth\n(admin login only)"]
        DB[("PostgreSQL\naccess_requests, approved_devices,\nphotos, albums")]
        STORE[("Supabase Storage\noriginals + thumbnails")]
        RT["Realtime\n(Postgres change feed)"]
    end

    VB -- "HTTPS" --> FE
    AB -- "HTTPS" --> FE
    FE --> API
    API -- "service role key" --> DB
    API -- "upload/delete objects" --> STORE
    API -- "verify session" --> AUTH
    DB -. "change events" .-> RT
    RT -. "live updates" .-> VB
    RT -. "live updates" .-> AB
    STORE -- "signed URLs" --> VB
```

## Access-request → approval → gallery flow

```mermaid
sequenceDiagram
    actor V as Visitor
    participant FE as Next.js App
    participant DB as Postgres (access_requests)
    participant RT as Supabase Realtime
    actor A as Admin

    V->>FE: Open domain
    FE->>V: Show name-entry gate
    V->>FE: Submit name
    FE->>DB: INSERT access_request (status=pending)
    FE->>V: Set anonymous device cookie
    FE->>V: Show "waiting for approval"
    DB-->>RT: change event (new pending row)
    RT-->>A: Live update: new request

    A->>FE: Open /admin dashboard
    FE->>A: Show pending requests (live)
    A->>FE: Click Approve
    FE->>DB: UPDATE access_request SET status=approved
    FE->>DB: INSERT approved_devices (token_hash)
    DB-->>RT: change event (approved)
    RT-->>V: Live update: approved

    FE->>V: Issue signed JWT cookie (httpOnly, secure)
    V->>FE: Redirect into gallery
    FE->>V: Serve gallery (photos + thumbnails)

    Note over V,FE: On future visits, the signed cookie alone grants access - no re-request, until Admin revokes it in approved_devices.
```

## Photo management flow (admin)

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Next.js App
    participant ST as Supabase Storage
    participant DB as Postgres (photos)
    actor V as Visitor (gallery)

    A->>FE: Upload photo(s)
    FE->>FE: Validate file type/size
    FE->>FE: Generate thumbnail (sharp)
    FE->>ST: Store original + thumbnail
    FE->>DB: INSERT photo row (storage_path, thumbnail_path)
    Note right of FE: Update/Delete follow the same path:\nAdmin action -> Storage mutation -> DB row mutation
    V->>FE: Load gallery
    FE->>DB: SELECT photos
    FE->>ST: Get signed URLs
    FE->>V: Render grid (reflects latest changes immediately)
```
