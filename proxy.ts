import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdminSession } from "@/lib/demo-staff";

function nextWithPath(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function sessionUserId(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/super-admin/login" || pathname.startsWith("/super-admin/login/")) {
    return nextWithPath(request, pathname);
  }

  if (pathname.startsWith("/super-admin")) {
    const session = await auth();
    const sessionUser = session?.user as { role?: string; phone?: string } | undefined;
    if (!sessionUserId(session) || !sessionUser || !isSuperAdminSession(sessionUser)) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const sessionUser = session!.user as { role?: string; phone?: string };
    const role = isSuperAdminSession(sessionUser) ? "super_admin" : sessionUser.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname === "/seller/register") {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    return nextWithPath(request, pathname);
  }

  if (pathname === "/seller" || pathname.startsWith("/seller/")) {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const role = (session!.user as { role?: string }).role;
    if (role !== "seller" && role !== "admin" && role !== "super_admin") {
      const next = pathname === "/seller" ? "/seller/dashboard" : pathname;
      return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(next)}`, request.url));
    }
  }

  if (pathname.startsWith("/pvz")) {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
    const role = (session!.user as { role?: string }).role;
    if (role !== "pvz_operator" && role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/profile")) {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
  }

  if (pathname === "/checkout/mock-pay") {
    return NextResponse.redirect(new URL("/checkout", request.url));
  }

  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
    const session = await auth();
    if (!sessionUserId(session)) {
      return NextResponse.redirect(new URL("/login?from=" + pathname, request.url));
    }
  }

  return nextWithPath(request, pathname);
}

export const config = {
  matcher: [
    "/super-admin",
    "/super-admin/:path*",
    "/admin",
    "/admin/:path*",
    "/seller",
    "/seller/:path*",
    "/pvz",
    "/pvz/:path*",
    "/profile",
    "/profile/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
};
