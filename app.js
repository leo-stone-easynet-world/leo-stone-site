const ARTICLE_INDEX_URL = "content/articles/index.json";

const formatDate = (iso) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(iso));

const categoryLabel = (category) => category === "finance" ? "Finance" : category === "ai" ? "AI" : "Technology";
const categoryClass = (category) => category === "finance" ? "badge-finance" : category === "ai" ? "badge-ai" : "badge-tech";
const articleUrl = (article) => `article.html?slug=${encodeURIComponent(article.slug)}`;
const AI_TERMS = ["ai", "artificial intelligence", "gemini", "automation", "large language", "generative"];
const NEWS_PAGE_SIZE = 9;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

async function loadIndex() {
  const response = await fetch(`${ARTICLE_INDEX_URL}?v=${Date.now()}`);
  if (!response.ok) throw new Error(`Unable to load article index: ${response.status}`);
  const data = await response.json();
  return [...data.articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function meta(article, withReadTime = false) {
  const row = el("div", "meta-row");
  row.append(el("span", `quiet-badge ${categoryClass(article.category)}`, categoryLabel(article.category)));
  row.append(el("span", "", formatDate(article.publishedAt)));
  if (withReadTime && article.readingMinutes) row.append(el("span", "", `${article.readingMinutes} min read`));
  return row;
}

function image(article, className) {
  const img = document.createElement("img");
  img.className = className;
  img.alt = article.imageAlt || article.title || "";
  img.loading = "lazy";
  img.src = article.image || "";
  img.onerror = () => {
    img.onerror = null;
    img.removeAttribute("src");
    img.hidden = true;
  };
  if (!article.image) img.hidden = true;
  return img;
}

function featured(article) {
  const link = el("a", "card featured-card text-decoration-none overflow-hidden");
  link.href = articleUrl(article);
  const row = el("div", "row g-0");
  const media = el("div", "col-lg-6");
  media.append(image(article, "featured-image"));
  const copy = el("div", "col-lg-6");
  const body = el("div", "card-body p-4 p-lg-5");
  body.append(meta(article, true));
  body.append(el("h3", "featured-title", article.title));
  body.append(el("p", "text-secondary", article.summary));
  body.append(el("span", "read-link", "Read briefing"));
  copy.append(body);
  row.append(media, copy);
  link.append(row);
  return link;
}

function card(article) {
  const col = el("div", "col-md-6 col-xl-4");
  const link = el("a", "card news-card h-100 text-decoration-none overflow-hidden");
  link.href = articleUrl(article);
  link.append(image(article, "news-image"));
  const body = el("div", "card-body");
  body.append(meta(article));
  body.append(el("h3", "news-title", article.title));
  body.append(el("p", "text-secondary", article.summary));
  body.append(el("span", "read-link", "Read analysis"));
  link.append(body);
  col.append(link);
  return col;
}

function aiNewsItem(article) {
  const link = el("a", "ai-news-item text-decoration-none");
  link.href = articleUrl(article);
  const copy = el("div", "");
  copy.append(meta(article, true));
  copy.append(el("h3", "", article.title));
  copy.append(el("p", "", article.summary));
  link.append(copy);
  link.append(el("span", "read-link", "Open"));
  return link;
}

function emptyState(text) {
  const node = el("div", "empty-state", text);
  return node;
}

function paginationButton(label, disabled, onClick, current = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = current ? "news-page-button active" : "news-page-button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function renderPagination(container, totalItems, currentPage, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(totalItems / NEWS_PAGE_SIZE));
  if (totalPages <= 1) {
    container.replaceChildren();
    return;
  }

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  const controls = el("nav", "news-pagination");
  controls.setAttribute("aria-label", "Article pagination");
  controls.append(paginationButton("Previous", currentPage === 1, () => onPageChange(currentPage - 1)));
  for (let page = adjustedStart; page <= end; page += 1) {
    controls.append(paginationButton(String(page), false, () => onPageChange(page), page === currentPage));
  }
  controls.append(paginationButton("Next", currentPage === totalPages, () => onPageChange(currentPage + 1)));
  container.replaceChildren(controls);
}

function isAiArticle(article) {
  return article.category === "ai";
}

async function renderHome() {
  const articles = await loadIndex();
  const aiArticles = articles.filter(isAiArticle).slice(0, 3);
  document.querySelector("#home-featured")?.replaceChildren(featured(articles[0]));
  document.querySelector("#home-grid")?.replaceChildren(...articles.slice(1, 4).map(card));
  document.querySelector("#home-ai-news")?.replaceChildren(
    ...(aiArticles.length ? aiArticles.map(aiNewsItem) : [emptyState("AI briefings will appear here as soon as the news desk has a fresh, source-backed item.")]),
  );
}

async function renderNews() {
  const articles = await loadIndex();
  const byCategory = {
    ai: articles.filter((article) => article.category === "ai"),
    technology: articles.filter((article) => article.category === "technology"),
    finance: articles.filter((article) => article.category === "finance"),
  };
  const pageState = { all: 1, ai: 1, technology: 1, finance: 1 };
  const panels = {
    all: { selector: "#news-all", pager: "#news-all-pagination", items: articles, emptyText: "No briefings are available yet." },
    ai: { selector: "#news-ai", pager: "#news-ai-pagination", items: byCategory.ai, emptyText: "No AI briefing is available yet. The next verified AI story will appear here." },
    technology: { selector: "#news-tech", pager: "#news-tech-pagination", items: byCategory.technology, emptyText: "No technology briefing is available yet." },
    finance: { selector: "#news-finance", pager: "#news-finance-pagination", items: byCategory.finance, emptyText: "No finance briefing is available yet." },
  };

  const renderPanel = (key) => {
    const panel = panels[key];
    const list = document.querySelector(panel.selector);
    const pager = document.querySelector(panel.pager);
    if (!list || !pager) return;
    const totalPages = Math.max(1, Math.ceil(panel.items.length / NEWS_PAGE_SIZE));
    pageState[key] = Math.min(Math.max(1, pageState[key]), totalPages);
    const start = (pageState[key] - 1) * NEWS_PAGE_SIZE;
    const pageItems = panel.items.slice(start, start + NEWS_PAGE_SIZE);
    list.replaceChildren(
      ...(pageItems.length ? pageItems.map(card) : [emptyState(panel.emptyText)]),
    );
    renderPagination(pager, panel.items.length, pageState[key], (page) => {
      pageState[key] = page;
      renderPanel(key);
      list.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  renderPanel("all");
  renderPanel("ai");
  renderPanel("technology");
  renderPanel("finance");
  document.querySelector("#all-tab")?.addEventListener("shown.bs.tab", () => renderPanel("all"));
  document.querySelector("#ai-tab")?.addEventListener("shown.bs.tab", () => renderPanel("ai"));
  document.querySelector("#tech-tab")?.addEventListener("shown.bs.tab", () => renderPanel("technology"));
  document.querySelector("#finance-tab")?.addEventListener("shown.bs.tab", () => renderPanel("finance"));
  activateHashTab();
}

function renderInlineImage(block) {
  const figure = el("figure", "inline-article-image");
  const img = document.createElement("img");
  img.alt = block.alt || "";
  img.loading = "lazy";
  img.src = block.src;
  img.onerror = () => {
    img.onerror = null;
    figure.remove();
  };
  figure.append(img);
  const caption = el("figcaption", "");
  caption.append(document.createTextNode(block.caption || block.alt || "Source image"));
  if (block.sourceUrl) {
    caption.append(document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = block.sourceUrl;
    link.rel = "noreferrer";
    link.textContent = block.sourceTitle ? `Source: ${block.sourceTitle}` : "Source article";
    caption.append(link);
  }
  figure.append(caption);
  return figure;
}

function activateHashTab() {
  if (!window.location.hash) return;
  const trigger = document.querySelector(`[data-bs-target="${window.location.hash}-panel"]`);
  if (trigger && window.bootstrap?.Tab) window.bootstrap.Tab.getOrCreateInstance(trigger).show();
}

function renderBlocks(blocks, container) {
  blocks.forEach((block) => {
    if (block.type === "heading") {
      container.append(el("h2", "", block.text));
      return;
    }
    if (block.type === "list") {
      const list = document.createElement("ul");
      block.items.forEach((item) => list.append(el("li", "", item)));
      container.append(list);
      return;
    }
    if (block.type === "image" && block.src) {
      container.append(renderInlineImage(block));
      return;
    }
    container.append(el("p", "", block.text));
  });
}

async function renderArticle() {
  const root = document.querySelector("#article");
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    root.replaceChildren(el("div", "alert alert-light border", "Article not found."));
    return;
  }
  const response = await fetch(`content/articles/${slug}.json?v=${Date.now()}`);
  if (!response.ok) throw new Error(`Unable to load article: ${response.status}`);
  const article = await response.json();
  document.title = `${article.title} | Leo Stone`;

  const shell = el("div", "row justify-content-center");
  const column = el("div", "col-lg-10 col-xl-8");
  const articleCard = el("div", "article-card");
  articleCard.append(image(article, "article-hero-image"));
  const body = el("div", "article-content");
  body.append(meta(article, true));
  body.append(el("h1", "", article.title));
  body.append(el("p", "article-summary", article.summary));
  const credit = el("p", "image-credit", article.imageCaption || article.imageAlt || "Source image");
  if (article.imageSourceUrl) {
    credit.append(document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = article.imageSourceUrl;
    link.rel = "noreferrer";
    link.textContent = article.imageSourceTitle ? `Source: ${article.imageSourceTitle}` : "Source article";
    credit.append(link);
  }
  body.append(credit);
  const articleBody = el("div", "article-body");
  const bodyBlocks = (article.body || []).filter((block) => !(block.type === "image" && block.src === article.image));
  renderBlocks(bodyBlocks, articleBody);
  if (article.sources?.length) {
    const sources = el("div", "sources");
    sources.append(el("h2", "", "Sources"));
    const list = document.createElement("ul");
    article.sources.forEach((source) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.textContent = source.title;
      link.rel = "noreferrer";
      item.append(link);
      list.append(item);
    });
    sources.append(list);
    articleBody.append(sources);
  }
  body.append(articleBody);
  articleCard.append(body);
  column.append(articleCard);
  shell.append(column);
  root.replaceChildren(shell);
}

async function main() {
  try {
    if (document.body.dataset.page === "home") await renderHome();
    if (document.body.dataset.page === "news") await renderNews();
    if (document.body.dataset.page === "article") await renderArticle();
  } catch (error) {
    console.error(error);
  }
}

main();
