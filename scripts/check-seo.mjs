import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SITE_URL = "https://leo.easynet.world";
const index = JSON.parse(fs.readFileSync(path.join(root, "content/articles/index.json"), "utf8")).articles;

const errors = [];
const parseJsonLd = (file, html) => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
  if (!blocks.length) {
    errors.push(`${file} missing JSON-LD`);
    return;
  }
  for (const block of blocks) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      errors.push(`${file} has invalid JSON-LD: ${error.message}`);
    }
  }
};

const requireIncludes = (file, text) => {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (!content.includes(text)) errors.push(`${file} missing ${text}`);
  return content;
};

for (const file of ["index.html", "about.html", "news.html", "article.html"]) {
  const html = requireIncludes(file, "<title>");
  for (const token of [
    '<meta name="description"',
    '<link rel="canonical"',
    'property="og:title"',
    'name="twitter:card"',
  ]) {
    if (!html.includes(token)) errors.push(`${file} missing ${token}`);
  }
}

for (const page of ["index.html", "about.html", "news.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  if (!html.includes('type="application/ld+json"')) errors.push(`${page} missing JSON-LD`);
  parseJsonLd(page, html);
}

for (const article of index) {
  const file = `articles/${article.slug}.html`;
  const html = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of [
    `<link rel="canonical" href="${SITE_URL}/articles/${article.slug}.html">`,
    '<meta property="og:type" content="article">',
    '<meta property="og:image"',
    '<meta name="twitter:image"',
    'type="application/ld+json"',
    '"@type": "Article"',
  ]) {
    if (!html.includes(token)) errors.push(`${file} missing ${token}`);
  }
  parseJsonLd(file, html);
}

const robots = requireIncludes("robots.txt", `Sitemap: ${SITE_URL}/sitemap.xml`);
if (!robots.includes("Allow: /")) errors.push("robots.txt missing Allow rule");

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locs = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]));
for (const loc of [`${SITE_URL}/`, `${SITE_URL}/news.html`, `${SITE_URL}/about.html`]) {
  if (!locs.has(loc)) errors.push(`sitemap missing ${loc}`);
}
for (const article of index) {
  const loc = `${SITE_URL}/articles/${article.slug}.html`;
  if (!locs.has(loc)) errors.push(`sitemap missing ${loc}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`SEO check passed for ${index.length} article pages and ${locs.size} sitemap URLs.`);
