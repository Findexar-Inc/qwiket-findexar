import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/vcc(.*)'])

export default clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req)) auth().protect()
})

export const config = {
    // matcher: ['/((?!.+\\.[\\w]+$|_next).*)','/',  '/(api|trpc)(.*)'],
    //  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)", "/account(.*)"],

    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)", "/vcc(.*)"],

};
