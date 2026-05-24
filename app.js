const ARTICLE_INDEX_URL = "content/articles/index.json";

const formatDate = (iso) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const categoryLabel = (category) =>
  category === "finance" ? "Finance" : "Technology";

const articleUrl = (article) => `article.html?slug=${encodeURIComponent(article.slug)}`;

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

function renderCard(article) {
  const link = el("a", "article-card");
  link.href = articleUrl(article);

  const image = document.createElement("img");
  image.src = article.image;
  image.alt = article.imageAlt || "";
  image.loading = "lazy";
  link.append(image);

  const body = el("div", "article-card-body");
  const meta = el("div", "meta-row");
  meta.append(el("span", `tag ${article.category}`, categoryLabel(article.category)));
  meta.append(el("span", "", formatDate(article.publishedAt)));
  body.append(meta);
  body.append(el("h3", "", article.title));
  body.append(el("p", "", article.summary));
  link.append(body);
  return link;
}

function renderStoryItem(article) {
  const link = el("a", "story-item");
  link.href = articleUrl(article);
  const meta = el("div", "meta-row");
  meta.append(el("span", `tag ${article.category}`, categoryLabel(article.category)));
  meta.append(el("span", "", formatDate(article.publishedAt)));
  link.append(meta);
  link.append(el("h3", "", article.title));
  link.append(el("p", "", article.summary));
  return link;
}

async function renderHome() {
  const latestGrid = document.querySelector("#latest-grid");
  const techList = document.querySelector("#technology-list");
  const financeList = document.querySelector("#finance-list");

  try {
    const articles = await loadIndex();
    latestGrid.replaceChildren(...articles.slice(0, 6).map(renderCard));
    techList.replaceChildren(
      ...articles.filter((article) => article.category === "technology").slice(0, 6).map(renderStoryItem),
    );
    financeList.replaceChildren(
      ...articles.filter((article) => article.category === "finance").slice(0, 6).map(renderStoryItem),
    );
  } catch (error) {
    latestGrid.replaceChildren(el("p", "empty-state", "Articles are being prepared."));
    console.error(error);
  }
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

    container.append(el("p", "", block.text));
  });
}

async function renderArticle() {
  const articleRoot = document.querySelector("#article");
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    articleRoot.replaceChildren(el("p", "empty-state", "Article not found."));
    return;
  }

  try {
    const response = await fetch(`content/articles/${slug}.json?v=${Date.now()}`);
    if (!response.ok) throw new Error(`Unable to load article: ${response.status}`);
    const article = await response.json();
    document.title = `${article.title} | Leo Stone`;

    const kicker = el("div", "article-kicker meta-row");
    kicker.append(el("span", `tag ${article.category}`, categoryLabel(article.category)));
    kicker.append(el("span", "", formatDate(article.publishedAt)));
    kicker.append(el("span", "", `${article.readingMinutes} min read`));

    const title = el("h1", "", article.title);
    const summary = el("p", "article-summary", article.summary);

    const figure = el("figure", "article-hero");
    const image = document.createElement("img");
    image.src = article.image;
    image.alt = article.imageAlt || "";
    figure.append(image);
    figure.append(el("figcaption", "", article.imageCaption || article.imageAlt || ""));

    const body = el("div", "article-body");
    renderBlocks(article.body, body);

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
      body.append(sources);
    }

    articleRoot.replaceChildren(kicker, title, summary, figure, body);
  } catch (error) {
    articleRoot.replaceChildren(el("p", "empty-state", "Article not found."));
    console.error(error);
  }
}

if (document.body.dataset.page === "article") {
  renderArticle();
} else {
  renderHome();
}
