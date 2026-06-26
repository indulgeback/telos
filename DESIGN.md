# Design System: YouMind

> Source: https://youmind.com · Extracted via `agent-browser` DOM + computed-style evidence (620 root CSS variables observed).

## 1. Visual Theme & Atmosphere

YouMind is an "AI Creation Studio with Taste," and the entire visual language is built to **sell taste as the product**. The marketing page pairs an editorial, almost magazine-like typographic voice (a serif display face for headlines) with the cool, restrained neutrality of a modern app shell (Inter body, near-monochrome surfaces). The result feels less like a typical SaaS landing page and more like a design publication that happens to sell software.

- **Overall feeling:** Editorial-meets-engineering. Confident, quiet, premium, and slightly literary. The page whispers rather than shouts — large whitespace, muted near-black ink on soft grey paper, and one emphatic serif gesture per section.
- **Visual density:** Low to medium. Sections are tall (often 500–1000px) and breathe; content never crowds the edges. The studio/app-preview section is the densest block, deliberately contrasting the airy marketing copy around it.
- **Brand posture:** Creator-tool that wants to be taken seriously by designers. Restrained color, intentional type pairing, and "design tokens as architecture" (620 CSS variables signal an internal design system, not a hand-styled site).
- **Signature motifs:** (1) Serif display headlines on a sans body — the single most identity-defining decision. (2) A pill-shaped, pure-black primary CTA that stays the same from hero to footer. (3) Decorative organic blob/cloud graphics in the hero (a green "cloud" shape over a soft blue field) that soften the otherwise crisp, geometric UI. (4) Near-monochrome palette where color is reserved for imagery, never for chrome.

### Key Characteristics

- **Serif display + sans body** — Libre Baskerville headlines, Inter everywhere else. The serif is the brand's handshake.
- **Monochrome-by-default chrome** — primary `#1f1f1f`, surfaces `#fff` / `#f7f7f7`. Color lives in content, not in buttons or borders.
- **Pill CTAs in ink black** — `border-radius: 300px` / `9999px`, `#1f1f1f` bg, white text, no border. Identical across the whole site.
- **Multi-tier radius system** — not one radius: `6px / 9px / 12px / 16px / 20px / 50–60px / pill`. Small controls stay crisp; cards are generous; buttons are full pills.
- **Shadow-as-whisper** — default shadows are barely-there (`rgba(2,4,26,0.05) 0 1px 2px`); depth is conveyed mostly by border + surface tone, not by elevation.
- **Full light/dark token set** — even though the marketing page is light-only, 620 vars include a complete `--dark-*` mirror, revealing an app that lives in both modes.

## 2. Color Palette & Roles

The system is intentionally desaturated. There is effectively **one chromatic brand moment** (a soft accent blue `#799cd4` and a green outline `#54d460`, both used sparingly); everything else is greyscale with alpha-based translucency for borders and muted states.

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Primary action | Ink | `#1f1f1f` | Primary buttons, strong text, hero CTA fill |
| Foreground text | Ink-fg | `#000000e0` (≈ `rgba(0,0,0,0.88)`) | Body & heading text on light surfaces |
| Page background | Paper | `#f7f7f7` | App/section background |
| Surface / card | Pure White | `#fff` | Cards, elevated panels, inputs |
| Muted text | Caption | `#0006` (≈ `rgba(0,0,0,0.4)`) | Captions, secondary metadata |
| Border (default) | Hairline | `#02041a29` (≈ `rgba(2,4,26,0.16)`) | Card & input borders |
| Border (subtle) | Whisper | `#1f1f1f0f` (≈ `rgba(31,31,31,0.06)`) | Soft dividers, layout borders |
| Destructive | Signal Red | `#ff382e` | Errors, delete actions |
| Soft accent | Mist Blue | `#799cd4` | Occasional highlight, secondary blue |
| Outline accent | Spring Green | `#54d460` | Primary outline / success-ish accent |

### Primary

- **Ink `#1f1f1f`** — the workhorse. Buttons, bold text, the "weight" of the page. Not pure black; deliberately softened to feel printed rather than digital.
- **Paper `#f7f7f7`** vs **Pure White `#fff`** — the two-tier surface trick: the page is soft grey, cards lift off it by being pure white. This is the primary depth mechanism.

### Interactive

- **Focus ring** `#09090b` — near-black, used for keyboard focus (the `--ring` token).
- **Hover/active** — `--muted` (`#02041a12`, ≈ `rgba(2,4,26,0.07)`) is the universal hover/active wash for interactive surfaces; selected/active states reuse the same muted token.
- **Links** — stay within ink/greyscale; no default link-blue. The brand avoids web-default hyperlink blue entirely.

### Neutral Scale

The neutral scale is **alpha-based on a near-black ink**, not a stepped grey ramp. This keeps surfaces feeling like the same "paper":

- `#000000e0` (0.88) — primary text
- `#0009` (0.35) — secondary text / secondary button fg
- `#0006` (0.24) — caption
- `#0000003d` (0.24) — disabled
- `#02041a29` (0.16) — default border
- `#02041a12` (0.07) — muted/hover bg
- `#02041a0a` (0.04) — accent/snip card bg

### Surface & Overlay

- **Background** `#f7f7f7` (sunken/page), **Surface** `#fff` (raised/card), **Surface-bg** `#1a1a1a` (dark mode card).
- **Overlay/active** uses translucent ink: `#02041829` for input borders, `#ffffff1f` for dark-mode card-muted overlays.

### Theme Modes

The marketing page renders in **light mode only** (no visible theme toggle), but the token set exposes a complete dark mirror — this is the design system of an app (the Studio), not just a landing page. Both must be carried into any recreation.

#### Light Mode (observed on the live page)

- Background: `#f7f7f7` (paper)
- Surface: `#fff` (cards), `#f7f7f7` (sunken)
- Text: `#000000e0` (primary), `#0006` (caption)
- Accent: `#1f1f1f` ink for actions; `#799cd4` mist blue rarely
- Border: `#02041a29` default, `#1f1f1f0f` subtle
- Notes: Alpha-based neutrals over pure-white card surfaces give the "printed paper" feel. Imagery carries all the color.

#### Dark Mode (from `--dark-*` tokens, not visibly toggled on marketing page)

- Background: `#141414`
- Surface: `#1a1a1a` (cards)
- Text: `#ddd` (primary), `#fff9` (muted-fg), `#fff6` (caption)
- Primary: inverts to `#fff` bg / `#000000e0` fg
- Accent: `#ffffff0f` (muted/hover), border `#fff3`
- Destructive: `#ff4238` (slightly hotter than light's `#ff382e`)
- Notes: Dark mode inverts the ink relationship — primary becomes white-on-near-black — but keeps the same alpha-over-dark philosophy (`#fff` with varying opacity instead of `#000`). Borders become white-alpha (`#fff3`).

### Shadows & Depth

Depth is deliberately understated; **border + surface contrast does most of the separation work**, shadows are a finishing whisper.

- **Default card shadow:** `rgba(2, 4, 26, 0.05) 0px 1px 2px 0px` — barely visible, 1px offset. Used on ~12 elements (the most common shadow).
- **Hero/statement shadow:** `rgba(31, 31, 31, 0.16) 0px 16px 36px 0px` — large, soft, 16px blur. Reserved for floating preview cards that need to "lift" off the hero canvas.
- **Soft ambient shadow:** `rgba(0, 0, 0, 0.08) 0px 4px 42px 0px` — very wide, very faint; for large imagery panels.
- **Inset glow:** `rgba(255, 255, 255, 0.2) 0px 0px 12px 0px inset` — rare inner highlight on dark/glass elements.
- **Focus:** no colored glow; the ring is a solid near-black `#09090b` outline.

## 3. Typography Rules

Typography is the loudest design decision on the page. The pairing of a **classical serif (Libre Baskerville)** for display with **Inter** for everything else is what separates YouMind from generic SaaS.

### Font Family

- **Display / Headlines:** `"Libre Baskerville", Georgia, "Times New Roman", "Songti SC", STSong, serif` — a slab-influenced serif with literary warmth. Used ONLY for hero/banner display headlines.
- **Body & UI (Primary):** `Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "San Francisco Pro", Roboto, sans-serif, "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans SC"` — the workhorse for body, buttons, nav, labels.
- **Monospace:** `JetBrains Mono` is loaded (observed in font class list) — used for code/numeric stats display.
- **Extra display faces loaded but situational:** Arvo, Instrument Serif, Literata, Bebas Neue, Pacifico, Cereal — these are available for *user-generated creative content* inside the Studio, not for marketing chrome. They signal that the product is a *typographic playground* for end users.
- **CJK fallbacks:** Songti SC / STSong for serif CJK; PingFang SC / Source Han / Noto Sans for sans CJK. Fully localized.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero headline | Libre Baskerville | 72px | 500 | 88px | normal | "Create bolder." — the serif signature, huge |
| Banner statement | Libre Baskerville | 50px | 600 | 60px | normal | Over imagery, white text, mid-page CTA banner |
| Section heading (h2) | Inter | 24px | 590 | 32px | normal | Section titles; weight 590 is an unusual, precise Inter weight |
| Body | Inter | 16px (base) | 400 | ~1.6 | normal | Standard reading text |
| Button / CTA label | Inter | 22px (hero), ~16px (others) | 500 | — | normal | Hero CTA text is oversized (22px) to match the hero |
| Caption / Meta | Inter | ~13–14px | 400 | — | normal | Uses `--caption` (`#0006`) color |

### Principles

- **The serif is rationed.** Libre Baskerville appears only on the largest display moments (hero, banner). Never in body, never in UI. This scarcity is what gives it weight.
- **Inter at non-default weights.** Headings use `590` (not 600) — a hyper-specific weight that signals a custom-tuned system, not off-the-shelf Tailwind defaults.
- **Scale is dramatic at the top.** Hero at 72px drops to h2 at 24px — a 3× jump that forces hierarchy by sheer size contrast.
- **Color reinforces hierarchy.** Primary text `#000000e0`, caption `#0006` — the opacity drop does the de-emphasizing, not a smaller size alone.

## 4. Component Stylings

### Buttons and Links

- **Primary CTA (the signature):** Pill, `#1f1f1f` ink fill, white text, `border-radius: 300px` (effectively a full pill), no border, `font-weight: 500`. Hero variant uses `22px` text ("Start for free"); footer variant ("Create now") is the same shape. This button is **identical from top to bottom of the page** — extreme consistency.
- **Secondary CTA / pill toggles:** The "Learn / Write / Image / Slides" row in the "Ready to create?" section uses lighter pill treatments — outline or muted bg with ink text.
- **Text links:** Stay within greyscale/ink; no underlines by default, no web-blue. Links behave like quiet UI affordances.
- **Hover and active feel:** Subtle. Hover applies the `--muted` wash (`rgba(2,4,26,0.07)`). No scale transforms, no color shifts to bright hues — restraint is the rule.

### Cards and Containers

- **Surface style:** Pure white `#fff` cards on the `#f7f7f7` paper background. Two-tier surface = the primary depth cue.
- **Radius:** `16px` for app/studio cards (`.prompt-card`), `12px` is the most common across the page (54 uses), `20px` for larger feature cards.
- **Border:** `1px` hairline at `#02041a29` (`rgba(2,4,26,0.16)`) — visible but soft. Subtle variant `#1f1f1f0f` for layout-level dividers.
- **Shadow or elevation:** Default `rgba(2,4,26,0.05) 0 1px 2px` (whisper). Statement cards in the hero get the big soft `0 16px 36px / 0.16` shadow.
- **Internal spacing:** Generous. Cards have large internal padding; content never touches card edges.

### Inputs and Interactive Controls

- **Input treatment:** Bordered, `#02041a29` border, white fill, `12px`–`16px` radius. Inputs match the card language — same radius tier, same border color.
- **Focus behavior:** Solid near-black ring `#09090b` (the `--ring` token). No blue glow, no shadow halo — focus is crisp and monochrome.
- **Selection states:** The `--select`/`--muted` token (`rgba(2,4,26,0.07)`) is reused for selected, active, and hovered controls — one translucent ink wash does all three jobs.

### Navigation

- **Structure:** The marketing page notably has **no traditional sticky top navbar** (no `<header>`/`<nav>` element was detected in the DOM). Navigation is minimal/implied; the hero owns the top of the page entirely. This is an unusual, confident choice — the brand leads with the statement, not with chrome.
- **Background treatment:** N/A on marketing page (no bar). In the app/Studio preview, expect a translucent/blurred surface (backdrop-filter) given the token architecture.
- **Link style:** Greyscale, quiet.
- **Sticky or scroll behavior:** No sticky header observed. The page is a long, single-scroll editorial flow.

### Image Treatment

- **Screenshot treatment:** Product screenshots (in "Made with YouMind" and the studio preview) sit in rounded containers (`16px`+ radius) with soft shadows, on white card surfaces.
- **Photography / illustration style:** Organic, soft, slightly dreamy. The hero uses a green "cloud"/blob organic shape over a soft blue gradient field — friendly, tactile, anti-geometric. This organic softness deliberately contrasts the crisp typographic grid.
- **Border and radius treatment:** Imagery gets larger radii (`20px`+) than controls; the rule is "the bigger the surface, the rounder the corner."

### Distinctive Components

- **Hero cloud graphic:** An organic green blob/cloud (`cloud-green-hero`) rendered on a canvas (`hero-cloud-gpu`) over a soft blue field (`hero-blue`). This is the single most distinctive visual — it says "creative, soft, generative" against the otherwise austere type.
- **Studio app preview:** A faux app window ("Your AI Creation Studio with Taste") showing Tasks / File / "Morning AI digest" — a product chrome mock with `prompt-card` elements at `16px` radius. Bridges marketing → product.
- **Stats with tabular numerals:** "YouMind in numbers" uses monospaced/tabular figures (the `0123456789` strips in the DOM reveal counter-style animations with fixed-width digits).
- **Full-bleed banner:** A 520px-tall image banner ("You've been meaning to create something...") with white serif text overlaid — magazine-style full-bleed editorial moment mid-page.

## 5. Layout Principles

### Spacing System

- **Base unit:** Root `--radius: 0.5rem` (8px) is the only explicit token; spacing otherwise follows a multiple-of-4/8 rhythm observed in paddings.
- **Repeated spacing values:** Section vertical padding is large and consistent — sections are 500–1000px tall. Internal card padding is generous (estimated 24–32px).

### Grid & Container

- **Grid logic:** Single-column, centered, vertical-scroll editorial. Not a multi-column feature grid — content stacks in narrative order.
- **Max content width:** `1280px` (the `section-1280` class appears on `use-cases`, `made`, `stats`, `ready-create` — the shared container width).
- **Section spacing:** Large vertical rhythm; each section is a distinct "page" in the scroll. Whitespace between sections is the breathing mechanism.

### Whitespace Philosophy

- **Whitespace philosophy:** Whitespace IS the design. The page is mostly empty surface; content occupies the center thin strip. This is editorial/magazine density, not dashboard density.
- **Alignment tendencies:** Center-aligned for hero/display moments; left-aligned for body and cards. The switch from centered hero to left-aligned content is deliberate.
- **Content width behavior:** Capped at `1280px`; body text columns are narrower still (estimated 600–720px for readability).

### Border Radius Scale

A clear multi-tier scale — **not** a single `border-radius` value:

- **Micro:** `6px` — small controls, tags, badges (12 uses)
- **Standard:** `9px` / `12px` — the workhorse; inputs, small cards (12 + 54 uses — `12px` is the mode)
- **Large:** `16px` / `20px` — content cards, studio cards, feature panels (5 + 20 uses)
- **Extra-large:** `40px` / `50px` / `60px` — large hero/feature surfaces (8 + 5 + 8 uses)
- **Pill:** `300px` / `9999px` — all primary CTAs and pill toggles (2 + 15 uses)

**Rule of thumb:** radius scales with surface size. Small control = 6–12px; card = 16–20px; hero panel = 40–60px; button = full pill.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No shadow, surface = page bg | Sunken sections, page background |
| Hairline | `1px` border `#02041a29`, no shadow | Default cards, inputs, dividers |
| Whisper | `rgba(2,4,26,0.05) 0 1px 2px` | Standard elevated cards |
| Statement | `rgba(31,31,31,0.16) 0 16px 36px` | Hero preview cards, floating product mocks |
| Ambient | `rgba(0,0,0,0.08) 0 4px 42px` | Large imagery panels |
| Focus | Solid `#09090b` ring, no glow | Keyboard focus on inputs/buttons |

### Depth Principles

- **Surface hierarchy via tone, not elevation:** The primary depth cue is `#f7f7f7` page vs `#fff` card. Shadows are secondary and nearly invisible by design.
- **Shadow language:** "Whisper by default, statement when needed." 95% of shadows are the 1px whisper; the big 16px shadow is rationed for hero moments only.
- **Blur / glass:** An inset white glow (`rgba(255,255,255,0.2) inset`) hints at glass treatments in dark/glass elements; backdrop-filter is expected in the app shell but not on the marketing page.
- **When depth is used vs avoided:** Depth is used to lift product previews off the hero canvas; it is avoided in body content, where border-alone separates cards. Never use heavy shadows on text-bearing content cards.

## 7. Do's and Don'ts

### Do

- **Pair a serif display with a sans body.** Use Libre Baskerville (or an equivalent literary serif) ONLY for the largest headlines; keep everything else in Inter.
- **Use the two-tier surface trick.** Page background `#f7f7f7`, cards pure `#fff`. Let tone separate, not shadow.
- **Make the primary CTA a full pill in ink `#1f1f1f`.** Keep it identical everywhere — consistency is the brand.
- **Keep chromatic color inside imagery.** Chrome (buttons, borders, text) stays monochrome; let photos/illustrations carry all hue.
- **Scale radius with surface size.** 6–12px for controls, 16–20px for cards, 40–60px for hero panels, pill for buttons.
- **Use alpha-based neutrals.** `rgba(0,0,0,0.x)` over a stepped grey ramp — it keeps surfaces feeling like the same paper.
- **Leave large whitespace.** Sections 500–1000px tall; content in a centered 1280px max strip.

### Don't

- **Don't use web-default link blue.** The palette has no `#3B82F6`-style blue for chrome. Accents are `#799cd4` mist (rare) and ink.
- **Don't apply heavy shadows to content cards.** The 16px statement shadow is for hero previews only; body cards get the 1px whisper or border-alone.
- **Don't use the serif in body or UI.** Libre Baskerville is display-only. Using it in body text breaks the system.
- **Don't introduce a colored hover state.** Hover is the muted ink wash (`rgba(2,4,26,0.07)`), never a hue shift.
- **Don't add a busy sticky navbar to the marketing page.** The page intentionally leads with the hero statement, not with navigation chrome.
- **Don't use pure `#000` for text.** Always the softened `#000000e0` (0.88 opacity) — printed, not digital.

## 8. Responsive Behavior

> Note: precise breakpoint values were not exposed in observed CSS; the following is inferred from the layout structure (`section-1280` container, single-column editorial flow) and standard practice. Label as inference.

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | < 768px | Hero headline scales down from 72px; organic cloud graphic scales; multi-up card grids collapse to single column; `1280px` container becomes full-width with reduced padding |
| Tablet | 768–1024px | 2-column card grids; hero type ~48–56px; banner statement ~36px |
| Desktop | ≥ 1024px | Full `1280px` container; 72px hero; 3-column "Made with" grid; full-bleed banner |

### Touch Targets

- Primary CTA pill is `52px` tall — comfortably above the 44px touch minimum.
- Pill toggles in "Ready to create?" are sized for tap.
- Card hit areas are large (full-card clickable where applicable).

### Collapsing Strategy

- **Desktop behavior:** Centered 1280px strip, generous side margins, multi-column card grids, full hero canvas with organic graphics.
- **Tablet behavior:** Card grids reduce to 2 columns; container narrows; hero type steps down.
- **Mobile behavior:** Single column throughout; hero cloud graphic scales or hides; banner becomes shorter; nav (if any in app) collapses to a menu.
- **Touch target adjustments:** Buttons stay ≥44px; spacing between tappable cards increases to avoid mis-taps.

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** `#1f1f1f` ink, pill, white text
- **Background:** `#f7f7f7` (light) / `#141414` (dark)
- **Heading text:** `#000000e0` (light) / `#ddd` (dark); serif for hero
- **Body text:** `#000000e0` on `#fff`/`#f7f7f7`
- **Border or ring:** `#02041a29` border, `#09090b` focus ring
- **Accent:** `#799cd4` mist blue (rare), `#54d460` spring green (outline)

### Quick Summary

YouMind is an editorial-monochrome creator-studio brand. Light grey paper background (`#f7f7f7`) with pure-white cards (`#fff`); depth comes from surface-tone contrast plus barely-there 1px shadows, with one big soft shadow reserved for hero previews. Headlines use Libre Baskerville serif at 72px; everything else is Inter. The single primary CTA is a full-pill (`border-radius: 300px`) in ink `#1f1f1f` with white text, identical site-wide. Color lives only in imagery and organic hero graphics — all chrome is greyscale with alpha-based neutrals. A complete dark-mode token set (`#141414` bg, white-on-near-black) exists for the app shell. Radius scales with size: 6–12px controls, 16–20px cards, 40–60px hero panels, pill buttons.

### Example Component Prompts

- **Hero:** "A full-viewport hero on `#f7f7f7` paper. Centered Libre Baskerville headline at 72px/weight-500/line-height-88px reading 'Create bolder.' in `#000000e0`. Below it a subhead in Inter. A pill CTA 'Start for free' — `border-radius:300px`, `background:#1f1f1f`, white text, `font-size:22px`, `font-weight:500`. Behind the text, a soft organic green cloud/blob shape over a faint blue gradient. Generous whitespace; no navbar."
- **Card:** "A content card on `#f7f7f7` bg: `background:#fff`, `border-radius:16px`, `border:1px solid rgba(2,4,26,0.16)`, `box-shadow:0 1px 2px rgba(2,4,26,0.05)`. Generous 24–32px internal padding. Body text Inter `#000000e0`. No heavy shadows."
- **Primary button:** "A pill button: `border-radius:300px` (or `9999px`), `background:#1f1f1f`, `color:#fff`, `font-family:Inter`, `font-weight:500`, no border, padding ~12px 28px. Identical whether hero or footer."
- **Navigation:** "No traditional sticky top navbar — lead with the hero. Where app chrome exists, use a translucent backdrop-blurred surface with greyscale links; never web-blue."

### Ready-to-Use Prompt

> Build a marketing page in the YouMind design language. Background `#f7f7f7`; cards pure white `#fff` with `1px solid rgba(2,4,26,0.16)` border and `box-shadow:0 1px 2px rgba(2,4,26,0.05)`. Display headlines in Libre Baskerville serif at 72px/500, body in Inter. The primary CTA is a full pill (`border-radius:300px`) in `#1f1f1f` with white text, reused identically everywhere. Use alpha-based greys for muted text (`rgba(0,0,0,0.4)`) and borders (`rgba(2,4,26,0.16)`); reserve chromatic color for imagery only. Cards use `16px` radius, controls `12px`, hero panels `40–60px`. Include a complete dark-mode set: `#141414` bg, `#1a1a1a` cards, white-on-near-black ink. Keep sections 500–1000px tall in a 1280px max-width centered column.

### Iteration Guide

1. **If it feels too plain, add type contrast — not color.** Switch a headline to Libre Baskerville before reaching for a hue.
2. **If depth feels flat, separate surfaces by tone first** (`#f7f7f7` → `#fff`); only then add the 1px whisper shadow. Never jump straight to a big shadow.
3. **If a button feels wrong, check the pill.** Primary CTAs must be full pills at `300px` radius in ink — anything sharper or more colored breaks the system.

## Optional Appendix: Interaction Patterns

- **Scroll behavior:** Long single-scroll editorial flow. Sections reveal as you scroll; the hero organic cloud graphic likely has a subtle parallax/generative animation (rendered on `<canvas>` via `hero-cloud-gpu`).
- **Hover behavior:** Subtle muted-ink wash (`rgba(2,4,26,0.07)`) on interactive surfaces; no scale transforms, no hue shifts.
- **Click behavior:** Primary CTAs navigate to signup; pill toggles switch content (Learn/Write/Image/Slides).
- **Animation tone:** Restrained, soft, slightly organic. The canvas hero suggests generative/cloud-like motion; the rest is quiet fades/opacity transitions. Numerical stats use tabular-figure counters (fixed-width digit animation).

## Optional Appendix: Content & Messaging Patterns

- **Headline pattern:** Short, imperative, one or two words. "Create bolder." "Ready to create?" — the verb leads, the serif gives it weight.
- **CTA language:** Low-friction, benefit-led: "Start for free", "Create now". Never "Sign up" or "Submit."
- **Trust signal pattern:** "Made with YouMind" (showcase gallery), "Meet our creators" (social proof), "YouMind in numbers" (quantified stats). Trust is shown, not asserted.
- **Voice and tone:** Confident, literary, creator-empathetic. Sentences like "Every idea deserves to take shape" and "You've been meaning to create something. For how long now?" — emotionally direct, mildly poetic, never corporate.

## Optional Appendix: Observed Pages

- **https://youmind.com/ (marketing home, light mode):** Sole page inspected. Provided the complete token set (620 vars incl. dark mirror), all component evidence, and the typographic system. Auth-gated app surfaces (the Studio) were not accessed; their behavior is inferred from the token architecture and the in-page Studio preview mock.

## Evidence Notes

- All color/type/radius/shadow values are **directly observed** via `agent-browser eval` computed styles and root CSS variables (620 declared `:root` vars).
- Dark-mode values come from `--dark-*` tokens (declared but not toggled on the marketing page) — labeled as token-observed, not visually-observed.
- Responsive breakpoints are **inferred** from container structure (`section-1280`) and layout patterns; not directly read from a media query. Labeled as inference above.
- One hero screenshot captured for visual cross-check; DOM/style evidence was the primary source per the skill's evidence-first rule.
