import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const competitorSlugs = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../lib/competitors/slugs.json'),
    'utf8',
  ),
);

/** Matches lib/site-config.ts brand.siteUrl */
const siteUrl = 'https://ilithiyana.co.za'.replace(/\/$/, '');
const root = process.cwd();
const outputDir = fs.existsSync(path.join(root, 'dist'))
  ? path.join(root, 'dist')
  : path.join(root, 'public');

/** Marketing pages only — no auth, dashboard, payment, or legacy developer page */
const COMPETITOR_ROUTES = competitorSlugs.flatMap((slug) => [
  `/alternatives/${slug}`,
  `/vs/${slug}`,
]);

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/apply-now',
  '/contact',
  '/career-guidance',
  '/alternatives',
  '/resources/subject-choice',
  '/terms',
  '/privacy',
  '/site-index',
  ...COMPETITOR_ROUTES,
];

const PRIORITY_MAP = {
  '/': '1.0',
  '/apply-now': '0.9',
  '/about': '0.9',
  '/contact': '0.8',
  '/career-guidance': '0.8',
  '/alternatives': '0.8',
  '/resources/subject-choice': '0.8',
  '/terms': '0.5',
  '/privacy': '0.5',
  '/site-index': '0.4',
};

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Johannesburg',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const urlset = PUBLIC_ROUTES.map((route) => {
  const priority = PRIORITY_MAP[route] ?? '0.6';
  const changefreq = route === '/' ? 'weekly' : 'monthly';
  return `  <url>
    <loc>${siteUrl}${route === '/' ? '' : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`,
);
fs.writeFileSync(
  path.join(outputDir, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /portal
Disallow: /api
Disallow: /welcome
Disallow: /payment

Sitemap: ${siteUrl}/sitemap.xml
`,
);
console.log(
  `Generated sitemap.xml and robots.txt for ${siteUrl} (${PUBLIC_ROUTES.length} routes)`,
);
