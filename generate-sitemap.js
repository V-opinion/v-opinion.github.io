const fs = require('fs');
const path = require('path');

// 1. Define your exact base URL (hardcoded to prevent environment fallbacks)
const BASE_URL = 'https://www.multireligionvalsystem.eu.org';

// 2. Define your static or core routes
// You can also fetch these dynamically from a database or API
const staticRoutes = [
  '/',
  '/about',
  '/contact',
  // Add other static pages here
];

// Optional: If you have dynamic pages (e.g., blog posts), load/fetch them here:
// const dynamicRoutes = ['/posts/post-one', '/posts/post-two'];
const allRoutes = [...staticRoutes];

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// 3. Build the XML string
const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (route) => `  <url>
    <loc>${BASE_URL}${route === '/' ? '' : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

// 4. Output the file to your public folder (adjust path to match your setup)
const outputPath = path.join(__dirname, 'public', 'sitemap.xml');

// Ensure the directory exists before writing
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sitemapXML, 'utf8');

console.log(`✅ Sitemap successfully generated at: ${outputPath}`);
