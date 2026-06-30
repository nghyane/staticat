// Canonical origin for SEO (canonical links, og:url, sitemap). Build-time env;
// defaults to the prod Pages domain. Override with PUBLIC_SITE_URL.
import { env } from '$env/dynamic/public';

export const SITE = (env.PUBLIC_SITE_URL ?? 'https://watchdex.pages.dev').replace(/\/$/, '');
