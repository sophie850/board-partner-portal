# BOARD — Design System

**BOARD** is a high-level, invitation-only business forum: *"Where Europe's most ambitious businesses meet the ideas, capital and partners to scale."* It convenes the people shaping how Europe's growth-stage companies scale — **CEOs and founders**, the **Chairs and Directors** guiding them, the **investors** backing them, and the **tech & advisory partners** accelerating them — for a 2.5-day gathering that blends the scale of a major forum with the intimacy of a working roundtable.

Tagline: **"Take your seat at the table."** / **"Roundtable thinking for boardroom leadership."**

> **Event edition.** The canonical edition is **BOARD Monaco 2027 — Grimaldi Forum, 22–24 March 2027**. (An earlier copy deck referenced a Cannes 2026 concept; that is superseded.)

This system covers BOARD across surfaces — **web, decks, and brand collateral** — from low-level foundations (colour, type, spacing, motion) through reusable components to full product recreations.

---

## Sources this was built from

- **`BOARD colours quick ref.png`** — the authoritative colour swatch sheet (Rich Black, Off White, Pure White, Teal, BOARD Blue, plus the fluted "graphics" motif). → `tokens/colors.css`
- **`ambit.zip`** — the **Ambit** typeface, 14 styles (Thin→Black + italics). Self-hosted in `assets/fonts/`. → `tokens/fonts.css`
- **`fre_bd_brochure_26_v0.8` (PDF, 51pp)** — the Monaco 2027 sponsorship brochure. Primary source for layout, page furniture, sponsorship inventory and pricing. Extracted copy informs the voice section below.
- **`Sophie's BOARD copy.docx`** — brand narrative & messaging ("Why BOARD, why now", "The Room", audience split). Primary source for tone of voice.
- **Rendered brochure screenshots** (cover, Introducing, The BOARD Room, section divider, Connectivity Partner) — reference for applied layout, confirming Ambit-Light display, teal price capsules, ticked footers, light + dark grounds.
- **`Adobe Express - AdobeStock_1383356901.mp4`** — the fluted teal→blue gradient motion graphic. Stored in `assets/video/`; poster frames in `assets/gradients/`.
- **boardsummits.com** — live site is a "launching soon" shell (JS-rendered content not machine-readable); not used as a source.

### Now supplied
- **Master logo artwork** — the official **BOARD wordmark** (SVG + PNG, black & white) and the **"B" icon mark** (PNG, black / white / BOARD Blue) are in `assets/logos/`. The `Wordmark` component renders the wordmark as inline vector (recolours via `color`) and can also show the icon (`variant="icon"`). The earlier type-based lockup has been replaced.

### Not supplied (flagged)
- **The full brand book PDF** was not received; the colour quick-ref, the Ambit fonts, the logos/icons, one gradient video, and the nine official gradient backgrounds all came through.

---

## Content fundamentals (voice & tone)

**Positioning:** confident, senior, exclusive. BOARD sells *proximity and access*, never hype. It is "a forum, not a conference." The reader is a prospective **partner/sponsor** — addressed as **"you / your brand."**

**Register & mechanics**
- **British English** — *prioritise, organisation, programme, centre.*
- **Headlines: ALL CAPS**, set in **Ambit Light**, tight leading, often stacked over 2–3 lines. e.g. `WHERE EUROPE'S MOST AMBITIOUS BUSINESSES MEET THE IDEAS, CAPITAL AND PARTNERS TO SCALE.`
- **Sub-labels / eyebrows:** short, uppercase, wide-tracked — `INTRODUCING`, `SECTION 01`, `WHY BOARD, WHY NOW`.
- **Body: sentence case**, measured, declarative. Short sentences. Frequent **anaphora**: *"Boards that move faster. Boards that engage more deeply. Boards that understand capital allocation."*
- **Em-dashes** for asides; **en-dashes** in ranges. Prices in **€** with thousands separators (`€15,000`), or **POA** / **FROM €X**.
- The wordmark **BOARD** is used **inline within headlines** ("The Room at **BOARD**", "Why **BOARD**, why now").
- **No emoji. No exclamation. No slang.** Numerals are a feature — big stats (*2000+ leaders, 40% CEOs, 35+ countries*) carry weight.

**Signature lines:** *Take your seat at the table · Your brand's seat at the table · Because ambitious businesses need ambitious leadership · Roundtable thinking for boardroom leadership.*

---

## Visual foundations

**The mark.** The official **BOARD wordmark** and **"B" icon** live in `assets/logos/` (SVG + PNG). The wordmark is drawn in the Ambit idiom — circular O, split-bowl B — confirming the type-led identity. Reach for the `Wordmark` component (inline vector, recolours via `color`) rather than the raw files when working in React.

**Grounds.** Dark-first. **Rich Black (#000000)** is the primary canvas; **Off White (#F1F1E4)**, a warm paper, is the primary light and also grounds full **light sections** (e.g. "The BOARD Room" infographic page). Pure White is reserved for maximum contrast. Use **one or two** grounds per artefact — don't checkerboard.

**Colour.** A tight palette: Rich Black · Off White · Pure White · **Teal (#016972)** · **BOARD Blue (#1A4DE7)**. The **fluted gradient** (aqua #31F9E5 → cyan → ink blue → BOARD Blue → deep blue #000D44) is the hero brand graphic. Teal owns **price capsules**; BOARD Blue owns **primary actions** and data highlights. A warm **amber (#C8763C)** is a confirmed accent, used for inline benefit sub-labels (e.g. "BRAND THE ACCESS").

**Contrast rule (authoritative — for text & lines).** On **black / dark** grounds, set text and lines only in **cyan, aqua, amber, grey, off-white or white** — *never* black, teal or BOARD Blue. On **white / off-white** grounds, set text and lines only in **teal, BOARD Blue, cyan, ink, amber, grey or black** — *never* aqua, off-white or white. This governs text, rules and borders; solid **fills** (a BOARD-Blue button, a teal capsule) are exempt as long as the text on top follows the rule. Aqua is a dark-ground accent; teal/blue are light-ground accents — the `data-theme="light"` scope already swaps `--text-accent`/`--accent-spark` from aqua to teal for you.

**Every surface paints its own background.** A section, card or slide must set its own `background` — never rely on inheriting the page/body background, because embedding contexts (the Design System tab, exports, email clients) don't always carry it, which would drop light text onto a light canvas.

**Type.** One family — **Ambit** — does everything. **Never heavier than Regular (400):** display/headlines in **Light (300)** caps, body in **Regular (400)**, and Light-vs-Regular is the only weight step. Big numerals use Light or **Thin/ExtraLight**. Hierarchy otherwise comes from size, uppercase tracking and colour — not weight. Labels/buttons are Regular caps with wide tracking, not bold. The heavier-looking **BOARD** in the brochure is the *logo artwork*, not type. See `tokens/typography.css`.

**The fluted motif.** The louvred teal→blue gradient is the hero brand graphic. Nine official background variants ship in `assets/gradients/` (`board-bg-1–9.png`) — used **full-bleed** as grounds, **circular-cropped** as a hero device, and as **media strips** on cards. The source motion graphic is `assets/video/board-gradient.mp4`.

**Layout & furniture.** Generous editorial whitespace on an 8px grid. Split layouts (full-bleed image / text panel). **Section dividers** carry a huge Light numeral (`01`) + eyebrow + Light-caps title over the gradient. Every page closes with the **ticked footer rule**: page marker · dashed baseline · venue (`Grimaldi Forum, Monaco`).

**Corners & capsules.** Corners are **crisp** (0–16px). The **pill/capsule (999px)** is the one signature curve — used for buttons, tags and price tags.

**Elevation.** Restrained. On dark, depth reads through **hairline borders** (`--border-subtle/-default/-strong`) and soft **accent glows** (`--glow-blue/-aqua/-teal`), not heavy drop shadows. Light sections use one soft blue-tinted shadow.

**Motion & states.** Calm and precise. Entrances fade/rise with `--ease-emphasis`; UI transitions use `--ease-standard` (~220ms). **Hover** brightens (accent → `--accent-hover`) or lifts a card 4px; **press** shrinks to `--press-scale` (0.98). Respect `prefers-reduced-motion` (durations collapse to 0). No bounce, no decorative infinite loops.

**Imagery.** A two-layer system. **Layer 1 — Fluted Light (abstract):** the louvred teal→blue gradient (`assets/gradients/board-bg-*.png`) for backgrounds, covers, section grounds and card media. **Layer 2 — Editorial Documentary (real subjects):** one blended world for **people** (candid, unposed, mid-conversation, shallow DOF), **places** (Monaco / Grimaldi / Riviera at blue-hour — marble, glass, water) and **sponsor inventory** (branded items in-situ, premium still-life). All subjects share **one grade**: cool base, teal/blue cast in the shadows, deep blacks, restrained warmth in skin, medium-high contrast, natural light, low saturation. Always lay a dark protective scrim under overlaid text. Never bright, busy or stocky. (See the *Imagery* specimen card.)

---

## Iconography

No proprietary icon set or icon font was supplied. The brochure uses **minimal, thin-stroke line icons** (e.g. a Wi-Fi glyph) that read as a **~1.5px monoline** set, consistent with Ambit's light weight. The **"B" icon mark** (`assets/logos/board-icon-*.svg`, black / white / BOARD Blue) is the brand's own device — use it as a favicon/avatar/standalone stamp, not as a UI glyph. Guidance:

- For UI kits/slides, use **[Lucide](https://lucide.dev)** (monoline, ~1.5–2px) via CDN as the closest match — **this is a substitution; confirm or supply the real set.**
- Icons are **sparing and functional**, never decorative clip-art. Match stroke weight to Ambit Light; keep them Off White on dark, Rich Black on light.
- **No emoji.** No filled/duotone icon styles.
- The **fluted gradient** and the **wordmark** carry brand identity — not iconography.

---

## Components

Reusable primitives live in `components/core/` (namespace `window.DesignSystem_086745`). Each has a `.jsx`, `.d.ts`, `.prompt.md`, and shares one showcase card (`core.card.html`).

Grouped by concern under `components/` (namespace `window.BOARDDesignSystem_086745`). Each has `.jsx`, `.d.ts`, `.prompt.md`, and a group showcase card.

**Core** (`components/core/`)
- **Wordmark** — official BOARD logo, inline vector (recolours via `color`); `variant="icon"` for the B mark.
- **Button** — primary (BOARD-Blue capsule), ghost (outline pill), link.
- **Eyebrow** — wide-tracked overline, optional section number.
- **Icon** — Lucide-backed UI glyph (inherits `currentColor`).
- **IconButton** — icon-only circular button (composes Icon).
- **Input** — dark-ground form field (label, helper, error, focus-to-blue).
- **Tag** — sponsor-category / metadata pill.
- **Stat** — oversized Ambit-Light figure + uppercase label.
- **Card** — content / sponsorship card (composes PriceTag; optional gradient media strip).
- **FeatureBlock** — amber uppercase sub-label + paragraph (benefit beat).
- **PriceTag** — teal price capsule (`€`, FROM, POA).
- **StarLevel** — the five-tier BOARD Star Level framework indicator.
- **FooterRule** — the ticked/hairline page-footer rule (marker · rule · venue).

**Layout** (`components/layout/`)
- **NavBar** — sticky site nav (wordmark, links, CTA; frosts on scroll).
- **Section** — page section wrapper (max-width, rhythm, eyebrow/title, `theme="light"`).
- **SiteFooter** — brand footer (wordmark, link columns, hairline rule).

**Event** (`components/event/`)
- **Countdown** — live count to the event datetime.
- **SpeakerCard** — speaker/delegate tile (photo or initials).
- **SessionRow** — agenda line (time, kind icon, stage, bookmark).
- **SponsorWall** — tiered grid of sponsor logo plates.

**Data viz** (`components/dataviz/`) — animated, use the `--chart-*` palette; respect reduced-motion.
- **StatCounter** — figure that counts up on mount.
- **PieChart** — animated pie / donut (segments sweep in).
- **BarChart** — bars grow in.
- **LineChart** — series draws in, optional area + dots.

`Icon` / `IconButton` / `SessionRow` need the **Lucide** UMD script on the page. Core's last four (`FeatureBlock`, `PriceTag`, `StarLevel`, `FooterRule`) are brand-specific devices from the brochure.

---

## UI kits

- **`ui_kits/website/`** — the **boardsummits.com homepage**: sticky nav, gradient hero, the "war-room" narrative, The Room stats, an **"Inside the room" band of graded image slots** (drop-in people / place / inventory photography), partner sectors + sponsorship cards, a working register form, and footer.
- **`ui_kits/event_app/`** — an **interactive mobile prototype** of the BOARD delegate app (agenda, session detail, delegates, my schedule) in an iOS frame — the brand applied to a product/prototype surface, using the icon set throughout.
- **`ui_kits/sponsorship_deck/`** — a click-through recreation of the sponsorship brochure as a web deck (cover → Introducing → The Room → section divider → a package page → the menu → contact).

## Slides

- **`slides/`** — reusable slide templates (title, section divider, big-stat, sponsorship package, big quote, pricing menu, contact) built on the components, sized 1280×720. Use these to assemble new BOARD decks.

## Templates (starting points for new projects)

Each is a `templates/<slug>/` Design Component consuming projects can copy:
- **Landing Page** (`templates/landing-page/`) — dark marketing page: gradient hero, stat band, CTA.
- **Social / Ad Set** (`templates/social-ad/`) — 1080×1080 post + 1080×1920 story at fixed export sizes.
- **One-Pager** (`templates/one-pager/`) — printable A4/Letter leave-behind (light theme).
- **Email** (`templates/email/`) — 600px responsive HTML email with CTA.
- **Sponsorship Deck** (`templates/sponsorship-deck/`) — title / divider / package deck.

---

## File index

- `styles.css` — global entry point (import-only).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `assets/fonts/` — Ambit OTFs (14 styles).
- `assets/logos/` — official wordmark (SVG + PNG) and B icon (SVG + PNG, black/white/blue).
- `assets/gradients/` — the nine official fluted-gradient backgrounds (`board-bg-1–9.png`).
- `assets/video/board-gradient.mp4` — the fluted gradient motion graphic.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/core/` — the reusable component library.
- `ui_kits/` — full-surface recreations.
- `slides/` — slide templates.
- `SKILL.md` — Agent-Skills manifest for downloading/using this system.

---

## Open questions for the brand owner

1. **Iconography** — the "B" mark is in; confirm **Lucide** for UI glyphs, or supply your intended library.
