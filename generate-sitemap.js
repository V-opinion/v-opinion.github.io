const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.multireligionvalsystem.eu.org';

// Huvudsidans rutter
const staticRoutes = [
  '/',
  '/EU/',
];

// Externa/subdomän-artiklar som du vill lyfta i sitemapen
const externalArticles = [
  'https://mre.multireligionvalsystem.eu.org/2026/11/valet-13-sep-2026-har-visat-tva-tydliga.html',
];

const today = new Date().toISOString().split('T')[0];

const internalUrls = staticRoutes.map(
  (route) => `  <url>
    <loc>${BASE_URL}${route === '/' ? '/' : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
);

const externalUrls = externalArticles.map(
  (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
);

const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...internalUrls, ...externalUrls].join('\n')}
</urlset>`;

const outputPath = path.join(__dirname, 'public', 'sitemap.xml');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sitemapXML, 'utf8');

console.log(`✅ Sitemap uppdaterad med ${internalUrls.length + externalUrls.length} URL:er.`);
