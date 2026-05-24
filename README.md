# Leo Stone Technology & Finance Site

A lightweight static publishing site for Leo Stone.

Public URL:

```text
https://leo.easynet.world/
```

## Content Model

The site does not need to be rebuilt when a new article is published. Add:

```text
content/articles/<slug>.json
assets/articles/<slug>.<ext>
```

Then add the article metadata to:

```text
content/articles/index.json
```

The homepage loads `content/articles/index.json`. Article pages load individual
JSON files through:

```text
article.html?slug=<slug>
```

## Article JSON

```json
{
  "slug": "example-article",
  "category": "technology",
  "title": "Article title",
  "summary": "Short summary.",
  "publishedAt": "2026-05-23T23:55:00Z",
  "readingMinutes": 5,
  "image": "assets/articles/example.svg",
  "imageAlt": "Image description",
  "imageCaption": "Optional caption.",
  "body": [
    { "type": "paragraph", "text": "Paragraph text." },
    { "type": "heading", "text": "Section title" },
    { "type": "list", "items": ["Point one", "Point two"] }
  ],
  "sources": [
    { "title": "Source title", "url": "https://example.com" }
  ]
}
```

Finance articles are informational analysis, not investment advice.

## Local Preview

Run a local static server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080
```

## Deploy

Deployments run on the Google Cloud VM behind Cloudflare Tunnel:

```bash
cd /srv/leo/leo-stone-site
git pull --ff-only
sudo nginx -t
sudo systemctl reload nginx
```

Verify:

```bash
curl -I http://localhost
curl -I https://leo.easynet.world/
```
