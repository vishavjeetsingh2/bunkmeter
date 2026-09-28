# Saved attendance and search growth

This follow-up replaces the session-only limitation of the first release. No accounts, remote attendance database, tracking SDKs or new dependencies are added.

## Product scope

- Quick calculation and up to 20 named subjects persist in this browser using IndexedDB.
- Each subject retains its target, remaining lectures and last 50 reversible class actions. Input edits start a new Undo baseline; new actions include their logging date and time; imported legacy actions can be undated.
- New calculation does not clear a named subject. The last removed subject is recoverable. Backup export/import supports manual device transfer; import adds subjects and never replaces existing records.
- A compact optional text guide explains the workflow. The calculator remains usable without naming a subject.
- Storage writes use a revision check in a single read/write transaction. A stale tab cannot overwrite newer saved data. Failed storage stays usable with a visible unsaved warning; malformed or unsupported records are not replaced.
- Clearing site data/private browsing can remove records. There is no account recovery or automatic cross-device sync. The privacy page explains this.

## Search Console baseline — inspected 28 September 2026

The owner-designated Google account already has access to the existing HTTPS URL-prefix property. No extra ownership verification or Cloudflare DNS change is needed.

- Three-month report (26 June–25 September): 169 clicks, 574 impressions, 29.4% CTR, average position 5.6 across reported queries. This is NOT the rank for “attendance calculator”.
- Reported queries mostly concern brand variations. “bunk calculator” has 7 impressions and zero clicks; “attendance” has 1 impression and zero clicks. No “attendance calculator” row appears in the report.
- Sitemap /sitemap.xml already submitted successfully, last read 25 September, 6 discovered pages at that point.
- Page indexing report last updated 21 September: 3 indexed, 2 alternate canonical URLs, 4 discovered/not indexed. The latter are legacy contact.html, disclaimer.html, privacy-policy.html and terms.html, now redirected by the first release.
- Homepage inspection: URL is on Google. Live test: URL available to Google, page can be indexed. Field Core Web Vitals has insufficient data.

## Implemented search work

- Main homepage title and the label next to the existing H1 explicitly describe the attendance calculator; the homepage remains the primary URL for this intent.
- Useful static explanations with worked examples, a linked calculation guide, existing WebApplication structured data. No fabricated reviews, keyword-page proliferation or FAQ rich-result promises.
- Guide added to sitemap and internal navigation; clean canonical URL and legacy .html redirect.
- Existing ranking URLs, homepage, contact address and preview noindex safeguards preserved.

## What to prioritize next

1. Observe real retention feedback: can students save, return, log and correct a class without confusion? Fix friction before adding more tools.
2. Use Search Console non-brand queries, page impressions and CTR to improve these existing pages. Recheck after Google recrawls; do not infer success from one day's ranking.
3. Keep bounded dated history and exact two-thirds support; avoid a calendar/timetable subsystem.
4. Consider installability/offline support after the saved workflow is stable. It adds update/cache maintenance and should earn its place through repeat use.
5. Defer cloud sync, notifications, payments and ads until demand supports their infrastructure/privacy costs.

Relevant documentation: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [how ranking/indexing works](https://developers.google.com/search/docs/fundamentals/how-search-works). Submission does not guarantee indexing or a particular rank.
