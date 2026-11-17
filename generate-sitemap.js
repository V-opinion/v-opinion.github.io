const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://www.multireligionvalsystem.eu.org';
const SITE_TITLE = 'Multi-Religion Election System';
const SITE_DESCRIPTION = 'Publications, analysis, and essays on the Multi-Religion Election System.';

const ROOT_DIR = __dirname;
const ARTICLES_DIR = path.join(ROOT_DIR, 'articles');
const ARTICLES_INDEX_PATH = path.join(ARTICLES_DIR, 'index.html');
const RSS_OUTPUT_PATH = path.join(ROOT_DIR, 'feed.xml');
const SITEMAP_OUTPUT_PATH = path.join(ROOT_DIR, 'sitemap.xml');

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

// Hjälpfunktion för att säkra text i XML (RSS & Sitemap)
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

// Extraherar rubrik, beskrivning och datum från en artikel-HTML
function extractArticleMetadata(fullPath, fallbackSlug) {
  const html = fs.readFileSync(fullPath, 'utf8');

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  let title = fallbackSlug.replace(/-/g, ' ');
  if (h1Match && h1Match[1].trim()) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  } else if (titleMatch && titleMatch[1].trim()) {
    title = titleMatch[1].split('|')[0].replace(/<[^>]+>/g, '').trim();
  }

  const descMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);

  const description = descMatch ? descMatch[1].trim() : '';

  const timeMatch = html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})["']/i);
  const date = timeMatch ? timeMatch[1] : getLastModDate(fullPath);

  return { title, description, date };
}

// Samlar alla artiklar i articles/ och returnerar dem sorterade (nyast först)
function collectArticles() {
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
          fullUrl: `${BASE_URL}${urlPath}`,
          title: meta.title,
          description: meta.description,
          date: meta.date
        });
      }
    }
  }

  findArticles(ARTICLES_DIR);
  articles.sort((a, b) => b.date.localeCompare(a.date));
  return articles;
}

// 1. Bygg översiktssidan articles/index.html
function buildArticlesIndex(articles) {
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
  <title>Articles | ${SITE_TITLE}</title>
  <meta name="description" content="${SITE_DESCRIPTION}">
  <link rel="canonical" href="${BASE_URL}/articles/">
  <link rel="alternate" type="application/rss+xml" title="${SITE_TITLE} RSS Feed" href="${BASE_URL}/feed.xml">
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
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    <a href="/feed.xml">RSS Feed</a>
  </nav>
  <main>
    <header>
      <h1>Articles</h1>
      <p class="subtitle">${SITE_DESCRIPTION}</p>
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

// 2. Bygg RSS-flödet feed.xml
function buildRssFeed(articles) {
  const lastBuildDate =
    articles.length > 0
      ? new Date(`${articles[0].date}T12:00:00Z`).toUTCString()
      : new Date().toUTCString();

  const itemsXml = articles
    .slice(0, 50) // Senaste 50 artiklarna i flödet
    .map((art) => {
      const pubDate = new Date(`${art.date}T12:00:00Z`).toUTCString();
      return `    <item>
      <title>${escapeXml(art.title)}</title>
      <link>${escapeXml(art.fullUrl)}</link>
      <guid isPermaLink="true">${escapeXml(art.fullUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(art.description || art.title)}</description>
    </item>`;
    })
    .join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${BASE_URL}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  fs.writeFileSync(RSS_OUTPUT_PATH, rssXml, 'utf8');
  console.log(`📡 feed.xml uppdaterad med ${Math.min(articles.length, 50)} artiklar.`);
}

// 3. Skanna hela webbplatsen för sitemap.xml
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

// Kör alla tre byggstegen i ordning
const allArticles = collectArticles();
buildArticlesIndex(allArticles);
buildRssFeed(allArticles);

const discoveredUrls = scanHtmlFiles(ROOT_DIR).sort((a, b) => {
  if (a.loc === `${BASE_URL}/`) return -1;
  if (b.loc === `${BASE_URL}/`) return 1;
  return a.loc.localeCompare(b.loc);
});

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

const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${discoveredUrls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

fs.writeFileSync(SITEMAP_OUTPUT_PATH, sitemapXML, 'utf8');
console.log(`✅ Sitemap uppdaterad med ${discoveredUrls.length} sidor.`);
