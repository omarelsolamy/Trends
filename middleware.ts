import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames (excluding API routes, static files, etc.)
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (Next.js internals)
    // - files with extensions (e.g., .png, .jpg)
    '/((?!api|_next|.*\\..*).*)'
  ]
};

