export function postLoginPath(role: string | null | undefined, from?: string | null): string {
  const next = from && from.startsWith("/") && !from.startsWith("//") ? from : null;

  if (role === "super_admin") {
    if (next?.startsWith("/pvz")) return next;
    if (next?.startsWith("/super-admin")) return next === "/super-admin" ? "/super-admin/dashboard" : next;
    return "/super-admin/dashboard";
  }

  if (role === "seller") {
    if (next === "/seller" || next?.startsWith("/seller/")) {
      if (next === "/seller" || next.startsWith("/seller/register")) return "/seller/dashboard";
      return next;
    }
    return "/seller/dashboard";
  }

  if (role === "admin") {
    if (next?.startsWith("/pvz")) return next;
    if (next?.startsWith("/admin")) return next === "/admin" ? "/admin/dashboard" : next;
    return "/admin/dashboard";
  }

  if (role === "pvz_operator") {
    if (next === "/pvz" || next?.startsWith("/pvz/")) return next;
    return "/pvz";
  }

  if (next?.startsWith("/pvz") || next?.startsWith("/seller") || next?.startsWith("/admin") || next?.startsWith("/super-admin")) {
    return "/profile";
  }
  if (next && !next.startsWith("/login")) return next;
  return "/profile";
}

/** Logged-in user opened a panel their role cannot enter, so the login form must stay. */
export function loginMustReauthenticate(role: string | null | undefined, from?: string | null): boolean {
  const next = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
  if (!next) return false;
  if (next === "/seller/register" || next.startsWith("/seller/register/")) return false;
  if (next === "/seller" || next.startsWith("/seller/")) {
    return role !== "seller" && role !== "admin" && role !== "super_admin";
  }
  if (next === "/super-admin" || next.startsWith("/super-admin")) {
    return role !== "super_admin";
  }
  return false;
}
