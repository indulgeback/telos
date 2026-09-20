# Telos — A little company for your big ideas

## Design

The new landing page introduces T as a creative working companion. The narrative moves from an inviting ideas room, through a real task composer, into a three-step story and an interactive example, before explaining personal context, reusable skills and approval checkpoints.

The palette combines cream paper, sage and ink. Existing T identity is retained in three newly generated illustrations. Original PNGs and optimized WebP derivatives are stored in `apps/web/public/landing/telos-world-v1/`. The built-in image_gen tool was used with `apps/web/public/brand/telos-ip.png` as the identity reference. Exact prompts are in `telos-world-v1-prompts.md`.

## Interactions

- Day/night atmosphere changes the page palette and hero illustration.
- Two illustration hotspots introduce T and the role of context; Escape dismisses them.
- The editable task composer preserves text through the existing chat prompt and sign-in callback contracts.
- Three suggested tasks populate the composer.
- Three expandable narrative chapters also control the example's current stage.
- Research, writing and planning examples each have three distinct stages, selectable directly or with Next / Replay.
- A selected example can be copied into the user's composer.
- Mobile navigation closes on link activation and Escape.
- Native anchor scrolling, scroll progress where supported, intersection reveals and hover feedback respect reduced motion.

Lenis provider, package reference, lock entries and exports were removed. Default marketing layout now uses native browser scrolling without the body OverlayScrollbars wrapper. Other consumers of OverlayScrollbars remain intact.

Existing shared header/footer links were updated to the new anchors. Dashboard and authentication behavior were preserved. The landing header/footer are scoped to the home route. New home title and description follow the locale.

## Localization

English base copy and Simplified Chinese copy are complete. Other existing locale files explicitly use the English landing copy as fallback, matching the prior landing page's English content; native copy for those languages is not included in this redesign.

## Verification — 2026-09-05

- Production build succeeded (Next.js 16.1.1).
- TypeScript `tsc --noEmit` passed.
- All 9 web test files passed: 39 tests, including 3 new landing tests.
- Full web lint: 0 errors, 3 existing warnings in root layout and chat image rendering.
- `git diff --check` passed.
- Desktop English and 390 × 844 Chinese mobile views visually reviewed.
- Verified scene hotspots, day/night control, scenario switching, all three example stages, replay, composer population, mobile menu, Escape, anchor navigation, and sign-in URL preserving the prompt.
- No horizontal overflow in the inspected mobile view.
- Browser screenshots saved under `telos-world-v1-preview/`.

The example is explicitly labeled as illustrative and does not call an agent. Local database connection failures prevented verifying actual sign-in and an authenticated agent run. The signed-out redirect was verified in the browser; the signed-in URL contract was covered by tests. No deployment, commit or push was performed.
