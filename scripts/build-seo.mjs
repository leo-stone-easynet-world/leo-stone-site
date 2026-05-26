import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://leo.easynet.world";
const SOCIAL_IMAGE = `${SITE_URL}/assets/leo-social-card.png`;
const AUTHOR = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: "Leo Stone",
  url: `${SITE_URL}/`,
};

const root = process.cwd();
const indexPath = path.join(root, "content/articles/index.json");
const articleIndex = JSON.parse(fs.readFileSync(indexPath, "utf8")).articles;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const absoluteUrl = (value = "") => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}/${value.replace(/^\/+/, "")}`;
};

const trimDescription = (value = "") => {
  const clean = String(value).replace(/\s+/g, " ").trim();
  if (clean.length <= 158) return clean;
  return `${clean.slice(0, 155).replace(/\s+\S*$/, "")}...`;
};

const categoryName = (category) => category === "ai" ? "Artificial Intelligence" : category === "finance" ? "Finance" : "Technology";

function articleDescription(article) {
  return trimDescription(article.summary || `${article.title} by Leo Stone.`);
}

function articleImage(article) {
  return absoluteUrl(article.image) || SOCIAL_IMAGE;
}

function articleBodyText(article) {
  return (article.body || [])
    .map((block) => {
      if (block.type === "heading" || block.type === "paragraph") return block.text || "";
      if (block.type === "list") return (block.items || []).join(". ");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function articleJsonLd(article, canonical, image) {
  const sources = (article.sources || [])
    .filter((source) => source.url)
    .map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: article.title,
    description: articleDescription(article),
    image: [image],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: AUTHOR,
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#publisher`,
      name: "Leo Stone",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: SOCIAL_IMAGE,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    articleSection: categoryName(article.category),
    inLanguage: "en",
    wordCount: articleBodyText(article).split(/\s+/).filter(Boolean).length,
    isAccessibleForFree: true,
    citation: sources,
  };
}

function renderArticlePage(article) {
  const canonical = `${SITE_URL}/articles/${article.slug}.html`;
  const readerUrl = `${SITE_URL}/article.html?slug=${encodeURIComponent(article.slug)}`;
  const title = `${article.title} | Leo Stone`;
  const description = articleDescription(article);
  const image = articleImage(article);
  const imageAlt = article.imageAlt || `${article.title} social image`;
  const jsonLd = JSON.stringify(articleJsonLd(article, canonical, image), null, 6)
    .replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="Leo Stone">
    <meta name="robots" content="index,follow">
    <meta name="theme-color" content="#f7f4ef">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" href="../favicon.svg" type="image/svg+xml">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Leo Stone">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
    <meta property="og:locale" content="en_US">
    <meta property="article:published_time" content="${escapeHtml(article.publishedAt)}">
    <meta property="article:modified_time" content="${escapeHtml(article.updatedAt || article.publishedAt)}">
    <meta property="article:author" content="Leo Stone">
    <meta property="article:section" content="${escapeHtml(categoryName(article.category))}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(article.title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
    <script type="application/ld+json">
      ${jsonLd}
    </script>
    <meta http-equiv="refresh" content="0; url=${escapeHtml(readerUrl)}">
    <script>window.location.replace(${JSON.stringify(readerUrl)});</script>
  </head>
  <body>
    <p><a href="${escapeHtml(readerUrl)}">Read ${escapeHtml(article.title)}</a></p>
  </body>
</html>
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function renderSitemap(articles) {
  const staticPages = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "hourly" },
    { loc: `${SITE_URL}/news.html`, priority: "0.9", changefreq: "hourly" },
    { loc: `${SITE_URL}/about.html`, priority: "0.6", changefreq: "monthly" },
  ];
  const urls = [
    ...staticPages,
    ...articles.map((article) => ({
      loc: `${SITE_URL}/articles/${article.slug}.html`,
      lastmod: article.updatedAt || article.publishedAt,
      priority: "0.8",
      changefreq: "weekly",
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((item) => `  <url>
    <loc>${escapeHtml(item.loc)}</loc>${item.lastmod ? `
    <lastmod>${escapeHtml(item.lastmod)}</lastmod>` : ""}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

for (const articleSummary of articleIndex) {
  const articlePath = path.join(root, "content/articles", `${articleSummary.slug}.json`);
  const article = JSON.parse(fs.readFileSync(articlePath, "utf8"));
  fs.writeFileSync(path.join(root, "articles", `${article.slug}.html`), renderArticlePage(article));
}

fs.writeFileSync(path.join(root, "robots.txt"), renderRobots());
fs.writeFileSync(path.join(root, "sitemap.xml"), renderSitemap(articleIndex));

console.log(`Generated SEO metadata for ${articleIndex.length} articles, robots.txt, and sitemap.xml.`);
