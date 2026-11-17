const PUBLIC_DIR = __dirname; // Läser från rotmappen i stället för 'public'
const OUTPUT_PATH = path.join(__dirname, 'sitemap.xml'); // Sparar i rotmappen
const fs = require('fs');
const path = require('path');

// Exakt bas-URL (hårdkodad för att förhindra felaktiga domäner)
const BASE_URL = 'https://www.multireligionvalsystem.eu.org';
const PUBLIC_DIR = path.join(__dirname, 'public');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

// Mappar eller filer i public/ som INTE ska tas med i sitemapen
const IGNORED_FILES = new Set(['404.html', 'google-verification.html']);
const IGNORED_DIRS = new Set(['assets', 'css', 'js', 'images', 'fonts']);

/**
 * Skannar rekursivt igenom public-mappen och returnerar alla HTML-sidor
 */
function scanHtmlFiles(dir, relativePath = '') {
  let urls = [];

  if (!fs.existsSync(dir)) {
    return urls;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const currentRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        urls = urls.concat(scanHtmlFiles(fullPath, currentRelPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      if (IGNORED_FILES.has(entry.name)) continue;

      // Omvandla index.html till ren mapp-URL (t.ex. /index.html -> /, /EU/index.html -> /EU/)
      let urlPath;
      if (entry.name === 'index.html') {
        urlPath = relativePath ? `/${relativePath}/` : '/';
      } else {
        urlPath = `/${currentRelPath}`;
      }

      // Hämta filens faktiska senaste ändringsdatum (YYYY-MM-DD)
      const stats = fs.statSync(fullPath);
      const lastmod = stats.mtime.toISOString().split('T')[0];

      urls.push({
        loc: `${BASE_URL}${urlPath}`,
        lastmod,
        priority: urlPath === '/' ? '1.0' : urlPath.includes('/2026/') ? '0.9' : '0.8',
      });
    }
  }

  return urls;
}

// Samla alla URL:er och sortera så att startsidan kommer först
const discoveredUrls = scanHtmlFiles(PUBLIC_DIR).sort((a, b) => {
  if (a.loc === `${BASE_URL}/`) return -1;
  if (b.loc === `${BASE_URL}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

// Generera giltig XML
const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${discoveredUrls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, sitemapXML, 'utf8');

console.log(`✅ Sitemap genererad med ${discoveredUrls.length} sidor i ${OUTPUT_PATH}`);
