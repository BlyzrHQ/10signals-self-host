# 10 Signals design system

10 Signals is an evidence-led competitive-intelligence product: a merchant enters a domain, the service crawls public pages, verifies competitors independently, matches comparable products with public prices, and benchmarks the shopping experience. The output is a saved, shareable report. Everything the interface claims carries a source and an observation date, and what it could not observe is said in words rather than hidden or shown as zero.

Sources this system was derived from:
- The 10 Signals prototype in this project (`10 Signals.dc.html`): landing, progress, report workspace (Competitors / Products / Benchmark), proposed modules, sign-in and account.
- GitHub repository `BlyzrHQ/market-signal` (branch `master`): `docs/product-contract.md`, `contracts/report-result.v1.schema.json`, `app/reports/[publicId]/loading/page.tsx`, `app/components/experience-benchmark.tsx`, `app/account/page.tsx`, `app/lib/billing-plans.ts`.
- Color tokens: the tweakcn "twitter" shadcn theme (light mode), `https://tweakcn.com/r/themes/twitter.json`.
- Logo: `assets/logo-dot.png` (a single blue dot, supplied by the user). No wordmark was supplied; the name is set in plain type next to the dot.

Bilingual: English (LTR) and Arabic (RTL) are first-class. Layout uses logical properties; numbers, prices, domains and URLs are always wrapped `dir="ltr"`.

## Content fundamentals

- Voice: plain, factual, second person ("you", "your product"). The product speaks about itself as "10 Signals" or "we" only in explanatory copy ("We could not find products to catalog").
- Sentence case everywhere: headings, buttons, tabs, table headers. Kickers (10–11px labels) are uppercase with wide tracking and are the only uppercase text.
- Say what was checked and what was not. Preferred phrasings: "Not observed" (never 0 or a bare dash), "Needs evidence", "Not calculable", "No proven gap", "No verified result", "Planned". A gap in coverage is a sentence, not an empty cell.
- No red/green judgement. Favourable vs unfavourable is words ("You are 13.6% lower", "Rival 14.7% lower") plus position; the one tinted state is blue "Inferred", meaning machine or rule-assisted judgement.
- Every recommendation carries its origin: "AI-drafted" or "Rule-based".
- Numbers are specific and tabular: "4 verified competitors · 27 accepted comparisons · 19 direct price comparisons". Separators are middle dots.
- Dates are written "14 Aug 2026". Prices keep the currency explicit and are always LTR.
- No emoji. Unicode glyphs ●, ◐, ◔, ○ are the evidence-state marks; ◆ │ ○ mark you / median / leader on the benchmark track; ⚠ marks a stopped run. Arrows → ↗ point to next moves and external links.
- Planned functionality is labelled "Planned" in a dashed pill and never presented as live.

## Visual foundations

- Ground: white page, `--surface` #f7f9f9 cards, #eff3f4 hairlines. Cards are flat: a 1px border or a 1px ring, no shadow. Elevation exists only for dialogs (`--shadow-md`).
- One accent: Twitter blue #1d9bf0 for lines, the "you" marker, links, selected states and the dot mark; #0b6cb0 for accent text on the #e8f5fe tint (4.5:1). Ink #0f1419 is used as a solid fill for "Observed" and "Complete" pills.
- Type: Plus Jakarta Sans, weights 400/600 only; hierarchy by size, not weight. Display 48/1.08 at −0.02em; H1 30; section titles 17–24; body 13–14; meta 11–12; kickers 10–11 uppercase tracked. Arabic uses Cairo at the same sizes. Tabular numerals in every column of figures.
- Spacing: 4px base, dense (12px card gaps, 14–20px card padding), max content width 1180px, left-aligned with room on the right.
- Radii: 14px on cards, inputs and rows; 20px on hero panels; 8px on image thumbs and small tracks; full pills on buttons, tags, chips and avatars.
- Borders: hairline #eff3f4 for structure, #cfd9de for controls, dashed #b9c4cb / #536471 for anything limited or planned.
- Backgrounds: no photography, no gradients, no textures. Product images are grey placeholder thumbs until real assets exist; a missing rival image is a dashed frame reading "No image".
- Motion: 200ms ease on drawers and hover, 600ms on the progress bar. One looping explainer on the landing page (14s, five stages) and nothing decorative. Respects prefers-reduced-motion.
- Hover: a #eff3f4 wash on ghost controls, a blue border on outlined ones. Pressed / selected: #e8f5fe tint with #0b6cb0 text and a #1d9bf0 border. Focus: 2px blue outline, 2px offset. Disabled: 45% opacity.
- Buttons are outlined pills (1px blue border, blue text) for primary actions; secondary are grey-bordered pills; ghost has no border. There is no solid-filled blue button.
- Charts: position tracks and bars only, every mark also printed as a number. No pie charts, no color-only encodings.
- Data: CSS-grid rows with an expandable evidence drawer; wide tables scroll horizontally with minimum column widths.

## Iconography

- No icon font. Interface marks are unicode glyphs (see Content fundamentals) so they render identically in both scripts and in exports.
- The two drawn icons are thumbs up/down (Lucide "thumbs-up" / "thumbs-down", 2px stroke), embedded inline in the FeedbackThumbs component.
- The logo is a dot: `assets/logo-dot.png`. Render it at 8–10px inline with a soft blue glow beside the name, or at 44px+ as an avatar-scale mark. Never stretch or recolor it.
- Product imagery: 36–72px square thumbs with 8px radius on #eff3f4.

## Index

- `design-system.html` — one-page reference (principles, tokens, glyphs, component inventory, kit, files).
- `styles.css` — entry point; imports `tokens/*.css`.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `fonts.css`, `base.css`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `assets/logo-dot.png` — the mark.
- `components/` — `_card_loader.js` (card fallback when the compiled bundle is absent) · `actions/` Button, IconButton, FeedbackThumbs · `labels/` EvidencePill, Tag, SourceTag · `navigation/` Tabs, FilterChips, NavBar · `forms/` Input, Select, Segmented · `surfaces/` Card, Dialog · `data/` DataTable, BenchmarkTrack, ProductMatchCard, ProgressPhases.
- `ui_kits/10signals/` — `index.html` click-through; `Landing.jsx`, `Progress.jsx`, `Report.jsx`, `SignIn.jsx`, `Account.jsx`.
- `SKILL.md` — agent skill entry point.
- `10 Signals.dc.html`, `github.md` — the original prototype and its repo association (not part of the system).

## Intentional additions
- `SourceTag` (AI-drafted / Rule-based) is split from Tag because it carries a fixed meaning and title text.

## Caveats
- Fonts are loaded from Google Fonts (no binaries supplied). Plus Jakarta Sans and Cairo were chosen for distinctiveness; swap in `tokens/fonts.css` + `tokens/typography.css`.
- The landing explainer animation is not componentised; it lives in the prototype and the kit shows a slot.
- Dark mode is not defined; the twitter theme's dark palette could be added as a second `:root` scope.
