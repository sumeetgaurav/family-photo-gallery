import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic-only check: redirect obviously-anonymous visitors away from
 * /gallery before it renders. This just reads the cookie's presence, not
 * its validity — the real check (signature, revocation) happens in
 * src/lib/auth/visitor.ts on every request, which is what actually matters
 * for security. Admin routes aren't covered here; verifyAdminSession() in
 * the admin layout does a real (non-optimistic) check on every render.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("gallery_session")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/gallery"],
};
