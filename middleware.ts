///Users/bobbygilbert/Documents/Github/platforms-starter-kit/middleware.ts


import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};


async function getAuthState(req: NextRequest) {
  const token = await getToken({ req });
  return {
    isAuthenticated: !!token,
    organizationId: token?.organizationId,
    needsOnboarding: token?.needsOnboarding,
    hasInvite: req.nextUrl.pathname.startsWith('/invite/'),
    inviteToken: req.nextUrl.pathname.startsWith('/invite/') 
      ? req.nextUrl.pathname.split('/invite/')[1] 
      : null
  };
}


export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  
  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  // Handle Vercel preview URLs
  if (
    hostname.includes("---") &&
    hostname.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    hostname = `${hostname.split("---")[0]}.${
      process.env.NEXT_PUBLIC_ROOT_DOMAIN
    }`;
  }

  // Handle cases for app.{domain}
  if (hostname === `app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    const authState = await getAuthState(req);
    
    // Special handling for invite links
    if (authState.hasInvite) {
      if (!authState.isAuthenticated) {
        // Redirect to login while preserving the invite token
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('invite', authState.inviteToken!); // Use 'invite' as the param
        return NextResponse.redirect(loginUrl);
      }
      // Allow the invite page to handle the token without rewriting
      return NextResponse.next();
    }

    // Handle authentication states
    if (!authState.isAuthenticated) {
      // Exclude login page from redirect
      if (pathname !== '/login') {
        // Preserve the original URL to redirect back after login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // Redirect authenticated users from login page
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      
      // Handle different authenticated states
      if (authState.needsOnboarding === true) { // Changed from if (authState.needsOnboarding)
        // Don't redirect if already on onboarding
        if (pathname !== '/onboarding') {
          return NextResponse.redirect(new URL('/onboarding', req.url));
        }
      } else if (!authState.organizationId) {
        // Handle users without an organization
        if (pathname !== '/onboarding') {
          return NextResponse.redirect(new URL('/onboarding', req.url));
        }
      } else if (pathname === '/onboarding' && !authState.needsOnboarding && authState.organizationId) {
        // If onboarding is complete and user tries to access onboarding page, redirect to home
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Rewrite to the correct app path
    return NextResponse.rewrite(
      new URL(`/app${pathname === "/" ? "" : pathname}`, req.url)
    );
  }

  // Handle root domain redirects
  if (
    hostname === "localhost:3000" ||
    hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN
  ) {
    return NextResponse.rewrite(
      new URL(`/home${pathname === "/" ? "" : pathname}`, req.url)
    );
  }

  // Rewrite everything else to /[domain]/[slug] dynamic route
  return NextResponse.rewrite(new URL(`/${hostname}${pathname}`, req.url));
}