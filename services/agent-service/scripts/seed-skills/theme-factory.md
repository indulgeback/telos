---
name: theme-factory
description: "Apply a curated professional color-and-font theme to any artifact (slide decks, documents, HTML pages, reports). Use when the user wants consistent, polished visual styling and asks for a theme, palette, or look-and-feel. Provides 10 ready-made themes with complete hex colors and font pairings baked in — no external files needed."
license: Complete terms in LICENSE.txt
---

# Theme Factory

Apply consistent, professional styling to presentation decks, documents, HTML landing pages, and reports. Each theme below is fully self-contained: color hex codes and font pairings are listed directly, ready to apply.

## Workflow

1. **Understand the target.** What artifact is being themed (slides? docs? HTML?) and what is its audience/tone?
2. **Present the theme options** (below) and ask the user to choose, or recommend one that fits the context.
3. **Wait for explicit confirmation** of the chosen theme.
4. **Apply the theme** — use the listed hex colors and fonts consistently across headers, body, accents, and backgrounds. Maintain contrast and readability throughout.

## Available Themes

### 1. Ocean Depths
Professional, calming maritime theme.
- **Primary:** `#1B4965` · **Accent:** `#5FA8D3` · **Background:** `#CAE9FF` · **Text:** `#0B2545`
- **Headers:** `Playfair Display` · **Body:** `Inter`

### 2. Sunset Boulevard
Warm, vibrant sunset palette.
- **Primary:** `#E63946` · **Accent:** `#F4A261` · **Background:** `#FFF3E0` · **Text:** `#6A040F`
- **Headers:** `DM Serif Display` · **Body:** `Source Sans 3`

### 3. Forest Canopy
Natural, grounded earth tones.
- **Primary:** `#2D6A4F` · **Accent:** `#95D5B2` · **Background:** `#F1FAEE` · **Text:** `#1B4332`
- **Headers:** `Merriweather` · **Body:** `Lato`

### 4. Modern Minimalist
Clean, contemporary grayscale.
- **Primary:** `#212529` · **Accent:** `#868E96` · **Background:** `#F8F9FA` · **Text:** `#212529`
- **Headers:** `Inter` · **Body:** `Inter`

### 5. Golden Hour
Rich, warm autumnal palette.
- **Primary:** `#BC6C25` · **Accent:** `#DDA15E` · **Background:** `#FEFAE0` · **Text:** `#7F5539`
- **Headers:** `Cormorant Garamond` · **Body:** `Mulish`

### 6. Arctic Frost
Cool, crisp winter-inspired theme.
- **Primary:** `#006D77` · **Accent:** `#83C5BE` · **Background:** `#EDF6F9` · **Text:** `#0F2A33`
- **Headers:** `Manrope` · **Body:** `Nunito Sans`

### 7. Desert Rose
Soft, sophisticated dusty tones.
- **Primary:** `#9D4B5C` · **Accent:** `#C97B84` · **Background:** `#F5E6E8` · **Text:** `#6D2F3C`
- **Headers:** `Lora` · **Body:** `Karla`

### 8. Tech Innovation
Bold, modern tech aesthetic.
- **Primary:** `#3A0CA3` · **Accent:** `#4361EE` · **Background:** `#0E1117` · **Text:** `#E9ECEF`
- **Headers:** `Space Grotesk` · **Body:** `IBM Plex Sans`

### 9. Botanical Garden
Fresh, organic garden colors.
- **Primary:** `#52796F` · **Accent:** `#84A98C` · **Background:** `#F5F5F0` · **Text:** `#2F3E46`
- **Headers:** `Fraunces` · **Body:** `Work Sans`

### 10. Midnight Galaxy
Dramatic, cosmic deep tones.
- **Primary:** `#7209B7` · **Accent:** `#F72585` · **Background:** `#10002B` · **Text:** `#E0AAFF`
- **Headers:** `Syne` · **Body:** `Outfit`

## Application Rules

- Use the theme's **Primary** for headers and key emphasis, **Accent** for highlights/links, **Background** as the base surface, and **Text** for body copy.
- Keep contrast at WCAG AA (4.5:1 for body text) — if a pairing falls short, darken the text shade slightly.
- Apply the font pairing via CSS `font-family` or the platform's typography setting. If a font is unavailable, fall back to a similar family in the same category (e.g. `Playfair Display` → `Georgia`).

## Create Your Own Theme

If none of the above fits, generate a custom theme. Based on the user's description (mood, industry, reference):
1. Pick a cohesive 3-4 color palette (primary, accent, background, text) with hex codes.
2. Choose a header font (distinctive) + body font (readable) pairing.
3. Name the theme to reflect its character.
4. Show it for review, then apply as above.
