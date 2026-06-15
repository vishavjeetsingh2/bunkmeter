# BunkMeter — Production Launch Checklist
> Complete this list before submitting for AdSense and going live.

---

## PHASE 1 — ASSETS (Do First)

- [ ] Create favicon set using https://realfavicongenerator.net (upload a 512×512 PNG of your logo)
  - Output: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
  - Output: `apple-touch-icon.png` (180×180)
  - Output: `safari-pinned-tab.svg`
  - Output: `mstile-*.png` files (70×70, 150×150, 310×150, 310×310)
  - Output: `icon-72x72.png` through `icon-512x512.png` for manifest
- [ ] Place all icon files in `/icons/` folder at root
- [ ] Create Open Graph image `og-preview.png` at 1200×630px
  - Recommended: dark background, BunkMeter logo, tagline, example of the SAFE state UI
  - Test at https://www.opengraph.xyz after deploying

---

## PHASE 2 — CONTENT AUDIT (AdSense Readiness)

- [ ] Replace every `https://bunkmeter.app` placeholder with your actual domain
- [ ] Replace `hello@bunkmeter.app` in contact.html with your real email
- [ ] Read through all 5 legal pages — update any placeholder text
- [ ] Confirm the "Last updated" date on privacy-policy.html, terms.html, disclaimer.html
- [ ] Ensure the Privacy Policy is linked from the footer on every page ✓ (already done)
- [ ] Ensure every page has a unique `<title>` and `<meta name="description">` ✓ (already done)
- [ ] Test all internal links — About, Privacy, Terms, Disclaimer, Contact ✓

---

## PHASE 3 — DEPLOYMENT (Netlify)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. From your project folder:
netlify init          # follow prompts, set publish dir to . (root)
netlify deploy        # preview deploy
netlify deploy --prod # production deploy
```

**netlify.toml** — create this file at your project root:
```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://pagead2.googlesyndication.com https://partner.googleadservices.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src https://googleads.g.doubleclick.net;"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=3600, must-revalidate"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=2592000, immutable"

# Pretty URLs (optional — removes .html extension)
[[redirects]]
  from = "/about"
  to = "/about.html"
  status = 200

[[redirects]]
  from = "/privacy-policy"
  to = "/privacy-policy.html"
  status = 200

[[redirects]]
  from = "/terms"
  to = "/terms.html"
  status = 200

[[redirects]]
  from = "/disclaimer"
  to = "/disclaimer.html"
  status = 200

[[redirects]]
  from = "/contact"
  to = "/contact.html"
  status = 200
```

**Enable Netlify Forms** for contact.html:
- The form already has `data-netlify="true"` and `name="contact"` attributes
- After deploying, go to Netlify Dashboard → Forms → verify "contact" form appears
- Set up email notifications for new submissions

---

## PHASE 4 — DEPLOYMENT (Vercel)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. From your project folder:
vercel          # preview deploy
vercel --prod   # production deploy
```

**vercel.json** — create this file at your project root:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",           "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options",    "value": "nosniff" },
        { "key": "Referrer-Policy",           "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",        "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000, immutable" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/about",          "destination": "/about.html" },
    { "source": "/privacy-policy", "destination": "/privacy-policy.html" },
    { "source": "/terms",          "destination": "/terms.html" },
    { "source": "/disclaimer",     "destination": "/disclaimer.html" },
    { "source": "/contact",        "destination": "/contact.html" }
  ]
}
```

> **Note on Vercel Forms:** Vercel does not handle form submissions natively. For the contact form on Vercel, replace the `action` attribute with a Formspree endpoint:
> 1. Sign up at https://formspree.io
> 2. Create a form and copy the endpoint URL
> 3. Set `action="https://formspree.io/f/YOUR_FORM_ID"` and `method="POST"` in contact.html

---

## PHASE 5 — SEO

- [ ] Submit sitemap to Google Search Console: https://search.google.com/search-console
  - Add property → URL prefix → `https://bunkmeter.app`
  - Verify via HTML file method or DNS TXT record
  - Sitemaps tab → Add sitemap → `https://bunkmeter.app/sitemap.xml`
- [ ] Submit sitemap to Bing Webmaster Tools: https://www.bing.com/webmasters
- [ ] Run Google Rich Results Test: https://search.google.com/test/rich-results
  - Test FAQ schema ✓
  - Test SoftwareApplication schema ✓
- [ ] Validate structured data: https://validator.schema.org
- [ ] Check Open Graph tags: https://www.opengraph.xyz
- [ ] Check Twitter card: https://cards-dev.twitter.com/validator

---

## PHASE 6 — PERFORMANCE

- [ ] Run Lighthouse audit (Chrome DevTools → Lighthouse tab)
  - Target: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95
- [ ] Run PageSpeed Insights: https://pagespeed.web.dev
- [ ] Known performance note: Tailwind CDN adds ~300KB. For production:
  - Option A: Use Tailwind CLI to generate a purged CSS file
    ```bash
    npm install -D tailwindcss
    npx tailwindcss -i ./input.css -o ./dist/styles.css --minify
    ```
    Then replace the CDN `<script>` with `<link rel="stylesheet" href="/dist/styles.css" />`
  - Option B: Keep CDN if Lighthouse score is acceptable (CDN is cached aggressively)

---

## PHASE 7 — GOOGLE ADSENSE APPLICATION

### Pre-submission requirements:
- [ ] Site has been live for at least 2–4 weeks with original content
- [ ] Site loads correctly on mobile and desktop
- [ ] Privacy Policy is present and linked from footer ✓
- [ ] Contact page is present and functional ✓
- [ ] No broken links (run https://www.drlinkcheck.com)
- [ ] Content is original, useful, and not auto-generated ✓
- [ ] No copyrighted material used without permission ✓
- [ ] No prohibited content (gambling, adult, weapons, etc.) ✓

### Application steps:
1. Sign in at https://adsense.google.com with your Google account
2. Enter your website URL: `https://bunkmeter.app`
3. Link AdSense to your site by placing the verification snippet in `<head>` of index.html
4. Wait for approval (typically 1–14 days)
5. After approval, uncomment the 3 ad slot blocks in index.html and replace placeholder values:
   - `ca-pub-XXXXXXXXXXXXXXXXXX` → your publisher ID
   - `XXXXXXXXXX` → your ad unit slot IDs (create units in AdSense dashboard)

### Ad slot locations (already marked in index.html):
| Slot | Position | Recommended Format |
|------|----------|--------------------|
| AD SLOT 1 | Below header, above calculator | Auto / Leaderboard (728×90 desktop, 320×50 mobile) |
| AD SLOT 2 | After result card | Rectangle (300×250) — high CTR position |
| AD SLOT 3 | Above footer | Auto / Leaderboard |

### AdSense policy reminders:
- Never click your own ads
- Do not place ads in ways that encourage accidental clicks
- Do not use deceptive layouts around ad units
- Always label ad containers with "Advertisement" text ✓ (already done)
- Keep at least 3 ad units max per page for new publishers

---

## PHASE 8 — SECURITY HEADERS VERIFICATION

After deploying, verify security headers at: https://securityheaders.com
Target grade: **A or A+**

Headers configured in netlify.toml / vercel.json:
- ✅ `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- ✅ `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` — privacy-safe referrers
- ✅ `Permissions-Policy` — disables unused browser APIs
- ✅ `Content-Security-Policy` — restricts script/style sources (netlify.toml)

---

## PHASE 9 — FINAL PRE-LAUNCH CHECKS

- [ ] All 6 HTML files open correctly in browser (index, about, contact, privacy, terms, disclaimer)
- [ ] Calculator math verified: try 90 attended / 120 total / 75% → should show 10 bunks
- [ ] Calculator math verified: try 60 attended / 120 total / 75% → should show CRISIS, 60 lectures needed
- [ ] Calculator math verified: try 60 attended / 120 total / 75% / 30 remaining → should show HOPELESS
- [ ] Mobile layout tested at 375px width (iPhone SE size)
- [ ] Dark mode background renders correctly (it's always dark by design ✓)
- [ ] FAQ accordion opens and closes correctly
- [ ] Share on WhatsApp button works (test on mobile)
- [ ] Footer legal links all work correctly
- [ ] Back to top link works
- [ ] Favicon appears in browser tab
- [ ] og-preview.png renders when link is shared on WhatsApp/Discord

---

## FILE STRUCTURE (Final)

```
bunkmeter/
├── index.html              ← Main calculator (1430 lines)
├── about.html              ← About page
├── contact.html            ← Contact form
├── privacy-policy.html     ← Privacy policy
├── terms.html              ← Terms of use
├── disclaimer.html         ← Disclaimer
├── sitemap.xml             ← For Google Search Console
├── robots.txt              ← Search engine directives
├── manifest.json           ← PWA / Add to Home Screen
├── browserconfig.xml       ← Windows tile config
├── netlify.toml            ← Netlify config + security headers (CREATE THIS)
├── vercel.json             ← Vercel config (CREATE THIS — alternative to netlify)
└── icons/                  ← CREATE THIS FOLDER
    ├── favicon.ico
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── safari-pinned-tab.svg
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-192x192.png
    ├── icon-512x512.png
    ├── mstile-70x70.png
    ├── mstile-150x150.png
    ├── mstile-310x150.png
    └── mstile-310x310.png
```

---

*BunkMeter Launch Checklist — v1.0 — June 2025*
