const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://www.multireligionvalsystem.eu.org';
const ROOT_DIR = __dirname;
const ARTICLES_DIR = path.join(ROOT_DIR, 'articles');
const ARTICLES_INDEX_PATH = path.join(ARTICLES_DIR, 'index.html');
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

// Mappar som ska ignoreras
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

// Extraherar rubrik och beskrivning från en HTML-fil
function extractArticleMetadata(fullPath, fallbackSlug) {
  const html = fs.readFileSync(fullPath, 'utf8');

  // Försök hitta <h1> först, annars <title>
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  let title = fallbackSlug.replace(/-/g, ' ');
  if (h1Match && h1Match[1].trim()) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  } else if (titleMatch && titleMatch[1].trim()) {
    title = titleMatch[1].split('|')[0].replace(/<[^>]+>/g, '').trim();
  }

  // Extrahera <meta name="description" content="...">
  const descMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);

  const description = descMatch ? descMatch[1].trim() : '';

  // Extrahera publiceringsdatum om det finns i <time datetime="YYYY-MM-DD">, annars Git-datum
  const timeMatch = html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})["']/i);
  const date = timeMatch ? timeMatch[1] : getLastModDate(fullPath);

  return { title, description, date };
}

// Skannar articles/ och skapar articles/index.html automatiskt
function buildArticlesIndex() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }

  const articles = [];

  function findArticles(dir, relDir = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      const currentRel = relDir ? `${relDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (!entry.name.endsWith('_data') && !entry.name.endsWith('_files')) {
          findArticles(fullPath, currentRel);
        }
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        // Hoppa över själva översiktssidan articles/index.html och ignorerade filer
        if (currentRel === 'index.html') continue;
        if (
          IGNORED_FILES.has(entry.name) ||
          IGNORED_FILE_PATTERNS.some((p) => p.test(entry.name))
        ) {
          continue;
        }

        const urlPath =
          entry.name === 'index.html'
            ? `/articles/${relDir}/`
            : `/articles/${currentRel}`;

        const slug = entry.name === 'index.html' ? relDir : entry.name.replace('.html', '');
        const meta = extractArticleMetadata(fullPath, slug);

        articles.push({
          url: urlPath,
          title: meta.title,
          description: meta.description,
          date: meta.date
        });
      }
    }
  }

  findArticles(ARTICLES_DIR);

  // Sortera nyaste artiklarna överst
  articles.sort((a, b) => b.date.localeCompare(a.date));

  const listItemsHtml =
    articles.length > 0
      ? articles
          .map(
            (art) => `      <li class="article-card">
        <time datetime="${art.date}">${art.date}</time>
        <h2><a href="${art.url}">${art.title}</a></h2>
        ${art.description ? `<p>${art.description}</p>` : ''}
      </li>`
          )
          .join('\n')
      : '      <li class="article-card"><p>No articles published yet.</p></li>';

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Articles | Multi-Religion Election System</title>
  <meta name="description" content="Explore articles, publications, and analysis on the Multi-Religion Election System.">
  <link rel="canonical" href="${BASE_URL}/articles/">
  <style>
    :root {
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --accent: #1d4ed8;
      --border: #e5e7eb;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-main);
      max-width: 740px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    nav {
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    nav a {
      color: var(--accent);
      text-decoration: none;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      margin-bottom: 2.5rem;
    }
    .article-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .article-card {
      padding: 1.5rem 0;
      border-top: 1px solid var(--border);
    }
    .article-card:last-child {
      border-bottom: 1px solid var(--border);
    }
    .article-card time {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .article-card h2 {
      font-size: 1.3rem;
      margin: 0.25rem 0 0.5rem 0;
    }
    .article-card h2 a {
      color: var(--accent);
      text-decoration: none;
    }
    .article-card h2 a:hover {
      text-decoration: underline;
    }
    .article-card p {
      margin: 0;
      color: var(--text-main);
    }
  </style>
</head>
<body>
  <nav aria-label="Breadcrumb">
    <a href="/">&larr; Back to Home</a>
  </nav>
  <main>
    <header>
      <h1>Articles</h1>
      <p class="subtitle">Publications, analysis, and essays on the Multi-Religion Election System.</p>
    </header>
    <ul class="article-list">
${listItemsHtml}
    </ul>
  </main>
</body>
</html>`;

  fs.writeFileSync(ARTICLES_INDEX_PATH, indexHtml, 'utf8');
  console.log(`📰 articles/index.html uppdaterad med ${articles.length} artiklar.`);
}

// Skannar hela webbplatsen för sitemap.xml
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

// 1. Bygg översiktssidan articles/index.html först (så att den också kommer med i sitemapen)
buildArticlesIndex();

// 2. Samla alla URL:er och sortera
const discoveredUrls = scanHtmlFiles(ROOT_DIR).sort((a, b) => {
  if (a.loc === `${BASE_URL}/`) return -1;
  if (b.loc === `${BASE_URL}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

// 3. Kontrollera och varna om dubbletter med stora/små bokstäver uppstår
const seenLowercase = new Map();
for (const item of discoveredUrls) {
  const lower = item.loc.toLowerCase();
  if (seenLowercase.has(lower)) {
    console.warn(
      `⚠️ Varning: Dubblett-URL med olika skiftläge hittades:\n  1: ${seenLowercase.get(lower)}\n  2: ${item.loc}`
    );
  } else {
    seenLowercase.set(lower, item.loc);
  }
}

// 4. Skriv ut sitemap.xml
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
console.log(`✅ Sitemap uppdaterad med ${discoveredUrls.length} sidor.`);
