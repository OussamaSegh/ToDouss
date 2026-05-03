import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/home(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/blog(.*)",
  "/api/webhooks(.*)",
  "/api/health",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  if (isPublicRoute(req)) return NextResponse.next();

  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  // sessionClaims.metadata is typed as Record<string, unknown>
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const onboarded = metadata?.["onboarded"] as boolean | undefined;

  if (!onboarded && !isOnboardingRoute(req)) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
