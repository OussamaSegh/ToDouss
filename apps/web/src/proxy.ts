import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/home(.*)",
  "/pricing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/blog(.*)",
  "/api/webhooks(.*)",
  "/api/health",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, redirectToSignIn } = await auth();

  // Never redirect API routes — they must always reach their handlers
  if (isApiRoute(req)) return NextResponse.next();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  // Check the plain `onboarded` cookie set by /api/auth/set-onboarded.
  // This avoids JWT cache timing issues that arise when checking Clerk sessionClaims.
  const onboarded = req.cookies.get("onboarded")?.value === "true";

  if (!onboarded && !isOnboardingRoute(req)) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
