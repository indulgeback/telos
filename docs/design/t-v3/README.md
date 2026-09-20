# Telos v3 — ideas made real

Reference visited: https://youmind.com/zh-CN and its Overview navigation on 2026-09-05. Observed a centered input-led hero, category-filtered suggestion cards, full-scene editorial imagery, three narrative cards, and a work gallery. Telos adapts those presentation principles with original assets and its own T character. No third-party illustrations or testimonial claims were copied.

## Page

The hero offers six localized starting prompts across Build, Explore and Create. Recommendation cards filter by category and populate the composer. A wide cloud studio leads into three illustrated chapters: gathering ideas, thinking through connections, and making a first version. Chapter cards also populate the composer. T's dedicated introduction retains the approved portrait and links to the existing skills page. The original TelosLogo stays in the navigation and footer. Native scrolling and reduced-motion behavior remain.

## Assets

Four original built-in imagegen outputs live in `apps/web/public/landing/t-v3/`: hero, gather, think and make. PNG masters are retained alongside WebP derivatives (615,594 bytes total). Identity reference is the approved `t-v2/portrait.png`. The exact prompts are in image-prompts.md. Source images are illustrative brand scenes, not screenshots or evidence of completed user projects.

## Localization and checks

LandingStudio now has 84 aligned keys in all seven locales. English and Simplified Chinese are authored; the other five have English fallback copy for the existing translation script. Translation has not been run.

39 web tests passed. TypeScript check passed. ESLint reports zero errors and three existing unrelated warnings. Desktop English/Chinese and 390px mobile layouts, category filtering, prompt prefilling, navigation and native chapter anchors were inspected. The local database-dependent authenticated chat execution was not tested.

Previous v2 page and CSS snapshots are retained here. No deployment or commit is requested.
