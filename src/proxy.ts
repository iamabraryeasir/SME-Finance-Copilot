import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/redis";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next internal routes, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 1. Edge Rate Limiting via Upstash Redis (Sliding Window: 100 req / 60s)
  if (ratelimit) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { success, limit, remaining, reset } = await ratelimit.limit(
      `edge:${ip}`,
    );

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        },
      );
    }
  }

  // Skip auth API endpoints from session redirect checks (protected by rate limiting above)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 2. Validate stateful session with Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role || "user";

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isDashboardPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/forecast") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/copilot") ||
    pathname.startsWith("/settings");
  const isAdminPage = pathname.startsWith("/admin");

  // 3. Authenticated user attempting to visit login/registration -> redirect to role dashboard
  if (isAuthenticated && isAuthPage) {
    const destination = userRole === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 4. Unauthenticated user attempting to access protected dashboard/admin -> redirect to /sign-in
  if (!isAuthenticated && (isDashboardPage || isAdminPage)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 5. Role-Based Access Control: standard users cannot access /admin
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
