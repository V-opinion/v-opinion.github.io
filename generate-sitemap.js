const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://www.multireligionvalsystem.eu.org';
const ROOT_DIR = __dirname;
const OUTPUT_PATH = path.join(ROOT_DIR, 'sitemap.xml');

// Exakta filnamn som ska ignoreras
const IGNORED_FILES = new Set([
  '404.html',
  'google-verification.html',
  'a.html'
]);

// Filnamnsmönster som ska ignoreras (t.ex. webbläsarsparade filer som a_002.html)
const IGNORED_FILE_PATTERNS = [
  /^a(_\d+)?\.html$/i
];

// Mappar som ska ignoreras ('articles' är INTE med här, så den skannas automatiskt)
const IGNORED_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'public',
  'assets',
  'css',
  'js',
  'images',
  'fonts',
  'a_data'
]);

// Hämtar det verkliga datumet då filen senast ändrades i Git
function getLastModDate(fullPath) {
  try {
    const gitDate = execSync(`git log -1 --format=%cs -- "${fullPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    if (gitDate) {
      return gitDate; // YYYY-MM-DD
    }
  } catch (err) {
    // Fallback om filen inte är committad i Git ännu
  }
  const stats = fs.statSync(fullPath);
  return stats.mtime.toISOString().split('T')[0];
}

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
      if (
        !IGNORED_DIRS.has(entry.name) &&
        !entry.name.endsWith('_data') &&
        !entry.name.endsWith('_files')
      ) {
        urls = urls.concat(scanHtmlFiles(fullPath, currentRelPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      if (
        IGNORED_FILES.has(entry.name) ||
        IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))
      ) {
        continue;
      }

      let urlPath;
      if (entry.name === 'index.html') {
        urlPath = relativePath ? `/${relativePath}/` : '/';
      } else {
        urlPath = `/${currentRelPath}`;
      }

      const lastmod = getLastModDate(fullPath);

      urls.push({
        loc: `${BASE_URL}${urlPath}`,
        lastmod
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

// Kontrollera och varna om dubbletter med stora/små bokstäver uppstår
const seenLowercase = new Map();
for (const item of discoveredUrls) {
  const lower = item.loc.toLowerCase();
  if (seenLowercase.has(lower)) {
    console.warn(`⚠️ Varning: Dubblett-URL med olika skiftläge hittades:\n  1: ${seenLowercase.get(lower)}\n  2: ${item.loc}`);
  } else {
    seenLowercase.set(lower, item.loc);
  }
}

const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${discoveredUrls
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

fs.writeFileSync(OUTPUT_PATH, sitemapXML, 'utf8');
console.log(`✅ Sitemap uppdaterad med ${discoveredUrls.length} sidor (inklusive articles/).`);
