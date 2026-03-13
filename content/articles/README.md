# Articles (SEO / blog)

Add markdown files here to publish articles. Each file is one article.

## Frontmatter (required at top of each file)

```yaml
---
title: Your Article Title
description: Short description for SEO and listing (1–2 sentences).
slug: url-friendly-slug
date: 2025-01-15
---
```

- **title** – Display and SEO title.
- **description** – Used in meta description and on the articles index.
- **slug** – URL path: `/articles/{slug}`. Use lowercase, hyphens, no spaces (e.g. `how-to-lease-in-la`).
- **date** – Publication date (YYYY-MM-DD). Articles are sorted by date, newest first.

## Body

Write content in Markdown below the frontmatter. You can use:

- **Bold**, *italic*, [links](https://example.com)
- Internal links: `[Lease specials](/lease-specials)` or `[Search cars](/search?vehicle_type=new)`
- Lists, headings (##, ###), etc.

## Adding many articles

1. Create one `.md` file per article in this folder.
2. Use a unique `slug` for each (e.g. `best-suvs-2025`, `lease-vs-buy-los-angeles`).
3. Rebuild or let the dev server pick up new files. Articles appear at `/articles` and in the sitemap.
