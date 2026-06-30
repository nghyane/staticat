// Canonical origin for SEO (canonical links, og:url, sitemap). Build-time
// inlined (static, not dynamic) so it reaches the client on pure-static
// prerendered pages. Defaults to the prod Pages domain.
import { PUBLIC_SITE_URL } from '$env/static/public';

export const SITE = (PUBLIC_SITE_URL || 'https://watchdex.pages.dev').replace(/\/$/, '');
