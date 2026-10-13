import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next internal routes, and authentication API handlers
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Validate stateful session with Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role || "user";

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isAdminPage = pathname.startsWith("/admin");

  // 1. Authenticated user attempting to visit login/registration -> redirect to role dashboard
  if (isAuthenticated && isAuthPage) {
    const destination = userRole === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 2. Unauthenticated user attempting to access protected dashboard/admin -> redirect to /sign-in
  if (!isAuthenticated && (isDashboardPage || isAdminPage)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 3. Role-Based Access Control: standard users cannot access /admin
  if (isAuthenticated && isAdminPage && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
