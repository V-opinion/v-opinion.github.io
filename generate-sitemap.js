const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.multireligionvalsystem.eu.org';
const ROOT_DIR = __dirname; // Läser direkt från rotmappen
const OUTPUT_PATH = path.join(ROOT_DIR, 'sitemap.xml'); // Skriver över sitemap.xml i rotmappen

// Filer och mappar i rotmappen som INTE ska tas med i sitemapen
const IGNORED_FILES = new Set(['404.html', 'google-verification.html']);
const IGNORED_DIRS = new Set(['.git', '.github', 'node_modules', 'public', 'assets', 'css', 'js', 'images', 'fonts']);

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

      let urlPath;
      if (entry.name === 'index.html') {
        urlPath = relativePath ? `/${relativePath}/` : '/';
      } else {
        urlPath = `/${currentRelPath}`;
      }

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

const discoveredUrls = scanHtmlFiles(ROOT_DIR).sort((a, b) => {
  if (a.loc === `${BASE_URL}/`) return -1;
  if (b.loc === `${BASE_URL}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

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

fs.writeFileSync(OUTPUT_PATH, sitemapXML, 'utf8');
console.log(`✅ Sitemap uppdaterad i rotmappen med ${discoveredUrls.length} sidor.`);
