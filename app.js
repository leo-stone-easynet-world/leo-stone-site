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
const articleUrl = (article) => `articles/${article.slug}.html`;
const AI_TERMS = ["ai", "artificial intelligence", "gemini", "automation", "large language", "generative"];
const NEWS_PAGE_SIZE = 9;
const SLIDESHOW_INTERVAL_MS = 5200;

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

function collectArticleImages(article) {
  const seen = new Set();
  const images = [];
  const add = (src, alt, caption, sourceTitle, sourceUrl) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    images.push({ src, alt: alt || article.title || "", caption: caption || alt || "", sourceTitle: sourceTitle || "", sourceUrl: sourceUrl || "" });
  };
  add(article.image, article.imageAlt, article.imageCaption, article.imageSourceTitle, article.imageSourceUrl);
  (article.body || []).forEach((block) => {
    if (block.type === "image") add(block.src, block.alt, block.caption, block.sourceTitle, block.sourceUrl);
  });
  (article.inlineImages || []).forEach((block) => add(block.src, block.alt, block.caption, block.sourceTitle, block.sourceUrl));
  return images;
}

function renderArticleMedia(article) {
  const slides = collectArticleImages(article);
  const frame = el("figure", "article-media-frame");
  if (!slides.length) return frame;

  let activeIndex = 0;
  let timer = null;
  const img = document.createElement("img");
  img.className = "article-hero-image";
  img.loading = "eager";
  const caption = el("figcaption", "article-media-caption");
  const controls = el("div", "media-controls");
  const playButton = el("button", "reader-button", "Pause images");
  const dots = el("div", "media-dots");

  const renderCaption = (slide) => {
    caption.replaceChildren(document.createTextNode(slide.caption || slide.alt || "Source image"));
    if (slide.sourceUrl) {
      caption.append(document.createTextNode(" "));
      const link = document.createElement("a");
      link.href = slide.sourceUrl;
      link.rel = "noreferrer";
      link.textContent = slide.sourceTitle ? `Source: ${slide.sourceTitle}` : "Source article";
      caption.append(link);
    }
  };

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    const slide = slides[activeIndex];
    img.src = slide.src;
    img.alt = slide.alt;
    renderCaption(slide);
    [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === activeIndex));
  };

  const stop = () => {
    clearInterval(timer);
    timer = null;
    playButton.textContent = "Play images";
  };

  const play = () => {
    if (slides.length <= 1 || timer) return;
    timer = setInterval(() => showSlide(activeIndex + 1), SLIDESHOW_INTERVAL_MS);
    playButton.textContent = "Pause images";
  };

  img.onerror = () => {
    slides.splice(activeIndex, 1);
    if (!slides.length) {
      stop();
      frame.remove();
      return;
    }
    showSlide(activeIndex);
  };

  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "media-dot";
    dot.setAttribute("aria-label", `Show image ${index + 1}`);
    dot.addEventListener("click", () => {
      showSlide(index);
      play();
    });
    dots.append(dot);
  });

  playButton.type = "button";
  playButton.addEventListener("click", () => {
    if (timer) stop();
    else play();
  });

  frame.append(img, caption);
  if (slides.length > 1) {
    controls.append(playButton, dots);
    frame.append(controls);
  }
  showSlide(0);
  play();
  return frame;
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

function renderBlocks(blocks, container, options = {}) {
  const skipImageUrls = options.skipImageUrls || new Set();
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
      if (skipImageUrls.has(block.src)) return;
      container.append(renderInlineImage(block));
      return;
    }
    container.append(el("p", "", block.text));
  });
}

function articleSpeechText(article) {
  const blockText = (article.body || [])
    .map((block) => {
      if (block.type === "heading" || block.type === "paragraph") return block.text || "";
      if (block.type === "list") return (block.items || []).join(". ");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
  return [article.title, article.summary, blockText].filter(Boolean).join("\n\n");
}

function renderReaderControls(article, nextArticle, previousArticle = null) {
  const controls = el("section", "reader-controls");
  if (article.audioUrl) controls.classList.add("has-audio");
  const copy = el("div", "reader-copy");
  copy.append(el("p", "eyebrow", "Listen"));
  copy.append(el("p", "", article.audioUrl ? "Listen to the generated article audio, or continue through the archive." : "Read this article aloud, or continue through the archive."));
  const articleAudio = article.audioUrl ? document.createElement("audio") : null;
  const actions = el("div", "reader-actions");
  const nextLink = el("a", "reader-next", nextArticle ? "Next article" : "No next article");
  const continuousLabel = el("label", "reader-toggle");
  const continuous = document.createElement("input");
  const params = new URLSearchParams(window.location.search);
  continuous.type = "checkbox";
  continuous.checked = params.get("continuous") === "1";
  continuousLabel.append(continuous, document.createTextNode(" Continuous reading"));

  if (nextArticle) nextLink.href = articleUrl(nextArticle) + "&continuous=" + (continuous.checked ? "1" : "0");
  else nextLink.removeAttribute("href");

  continuous.addEventListener("change", () => {
    if (nextArticle) nextLink.href = articleUrl(nextArticle) + "&continuous=" + (continuous.checked ? "1" : "0");
  });

  if (articleAudio) {
    const iconPaths = {
      play: ["M8 5v14l11-7-11-7Z"],
      pause: ["M8 5v14", "M16 5v14"],
      volume: ["M11 5 6 9H3v6h3l5 4V5Z", "M15.5 8.5a5 5 0 0 1 0 7"],
      previous: ["M19 20 9 12l10-8v16Z", "M5 19V5"],
      repeat: ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
      next: ["M5 4l10 8-10 8V4Z", "M19 5v14"],
    };
    const iconButton = (name, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reader-icon-button audio-control-button";
      button.setAttribute("aria-label", label);
      button.title = label;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      for (const d of iconPaths[name]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.append(path);
      }
      button.append(svg);
      return button;
    };
    const setIcon = (button, name) => {
      const svg = button.querySelector("svg");
      svg.replaceChildren();
      for (const d of iconPaths[name]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.append(path);
      }
    };
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return mins + ":" + String(secs).padStart(2, "0");
    };
    const player = el("div", "article-audio-player article-audio-custom");
    const playButton = iconButton("play", "Play");
    const time = el("span", "audio-time", "0:00 / 0:00");
    const progress = document.createElement("input");
    progress.type = "range";
    progress.className = "audio-progress";
    progress.min = "0";
    progress.max = "1000";
    progress.value = "0";
    progress.setAttribute("aria-label", "Seek");
    const volumeButton = iconButton("volume", "Mute");
    const previousButton = iconButton("previous", "Previous article");
    const continuousButton = iconButton("repeat", "Continuous reading");
    const nextButton = iconButton("next", "Next article");
    previousButton.disabled = !previousArticle;
    nextButton.disabled = !nextArticle;
    const syncContinuousButton = () => {
      continuousButton.classList.toggle("active", continuous.checked);
      continuousButton.setAttribute("aria-pressed", continuous.checked ? "true" : "false");
      if (nextArticle) nextLink.href = articleUrl(nextArticle) + "&continuous=" + (continuous.checked ? "1" : "0");
    };
    previousButton.addEventListener("click", () => {
      if (previousArticle) window.location.href = articleUrl(previousArticle) + "&continuous=" + (continuous.checked ? "1" : "0");
    });
    continuousButton.addEventListener("click", () => {
      continuous.checked = !continuous.checked;
      syncContinuousButton();
    });
    nextButton.addEventListener("click", () => {
      if (nextArticle) window.location.href = articleUrl(nextArticle) + "&continuous=" + (continuous.checked ? "1" : "0");
    });
    articleAudio.className = "article-audio-source";
    articleAudio.preload = "metadata";
    articleAudio.src = article.audioUrl;
    const syncPlayer = () => {
      setIcon(playButton, articleAudio.paused ? "play" : "pause");
      playButton.setAttribute("aria-label", articleAudio.paused ? "Play" : "Pause");
      playButton.title = articleAudio.paused ? "Play" : "Pause";
      const duration = articleAudio.duration || 0;
      progress.value = duration ? String(Math.round((articleAudio.currentTime / duration) * 1000)) : "0";
      time.textContent = formatTime(articleAudio.currentTime) + " / " + formatTime(duration);
      volumeButton.classList.toggle("active", articleAudio.muted || articleAudio.volume === 0);
    };
    playButton.addEventListener("click", () => {
      if (articleAudio.paused) articleAudio.play().catch(() => {});
      else articleAudio.pause();
    });
    progress.addEventListener("input", () => {
      if (!articleAudio.duration) return;
      articleAudio.currentTime = (Number(progress.value) / 1000) * articleAudio.duration;
    });
    volumeButton.addEventListener("click", () => {
      articleAudio.muted = !articleAudio.muted;
      syncPlayer();
    });
    articleAudio.addEventListener("loadedmetadata", syncPlayer);
    articleAudio.addEventListener("timeupdate", syncPlayer);
    articleAudio.addEventListener("play", syncPlayer);
    articleAudio.addEventListener("pause", syncPlayer);
    articleAudio.addEventListener("ended", () => {
      syncPlayer();
      if (continuous.checked && nextArticle) {
        window.location.href = articleUrl(nextArticle) + "&read=1&continuous=1";
      }
    });
    player.append(playButton, time, progress, volumeButton, previousButton, continuousButton, nextButton);
    controls.append(copy, articleAudio, player);
    syncContinuousButton();
    syncPlayer();
    if (params.get("read") === "1") setTimeout(() => articleAudio.play().catch(() => {}), 400);
    return controls;
  }

  const readButton = el("button", "reader-button primary", "Read aloud");
  const pauseButton = el("button", "reader-button", "Pause");
  const stopButton = el("button", "reader-button", "Stop");
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const text = articleSpeechText(article);
  let utterance = null;
  let reading = false;

  const stopSpeech = () => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    reading = false;
    readButton.textContent = "Read aloud";
    pauseButton.textContent = "Pause";
  };

  const startSpeech = () => {
    if (!canSpeak) {
      readButton.textContent = "Speech unavailable";
      readButton.disabled = true;
      return;
    }
    stopSpeech();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    utterance.onend = () => {
      reading = false;
      readButton.textContent = "Read aloud";
      if (continuous.checked && nextArticle) {
        window.location.href = articleUrl(nextArticle) + "&read=1&continuous=1";
      }
    };
    window.speechSynthesis.speak(utterance);
    reading = true;
    readButton.textContent = "Restart";
  };

  readButton.type = "button";
  pauseButton.type = "button";
  stopButton.type = "button";
  readButton.addEventListener("click", startSpeech);
  pauseButton.addEventListener("click", () => {
    if (!canSpeak || !reading) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      pauseButton.textContent = "Pause";
    } else {
      window.speechSynthesis.pause();
      pauseButton.textContent = "Resume";
    }
  });
  stopButton.addEventListener("click", stopSpeech);
  window.addEventListener("beforeunload", stopSpeech, { once: true });

  actions.append(readButton, pauseButton, stopButton, continuousLabel, nextLink);
  controls.append(copy, actions);

  if (params.get("read") === "1") {
    setTimeout(startSpeech, 700);
  }
  return controls;
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
  const articles = await loadIndex();
  const currentIndex = articles.findIndex((item) => item.slug === article.slug);
  const nextArticle = currentIndex >= 0 ? articles[currentIndex + 1] : null;
  const previousArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  document.title = `${article.title} | Leo Stone`;

  const shell = el("div", "row justify-content-center");
  const column = el("div", "col-lg-10 col-xl-8");
  const articleCard = el("div", "article-card");
  articleCard.append(renderArticleMedia(article));
  const body = el("div", "article-content");
  body.append(meta(article, true));
  body.append(el("h1", "", article.title));
  body.append(el("p", "article-summary", article.summary));
  body.append(renderReaderControls(article, nextArticle, previousArticle));
  const articleBody = el("div", "article-body");
  const mediaImageUrls = new Set(collectArticleImages(article).map((image) => image.src));
  renderBlocks(article.body || [], articleBody, { skipImageUrls: mediaImageUrls });
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
