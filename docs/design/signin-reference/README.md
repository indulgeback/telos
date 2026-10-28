# Telos sign-in reference and original artwork

Reference inspected on 2026-10-28: https://youmind.com/zh-CN/sign-in

The requested direction is a close reconstruction of its sign-in layout with
Telos branding. The approved character remains T version B: black bob, cream
hoodie, sage square patch, black terminal shirt and a relaxed expression.

## Measured desktop geometry

At 1280 × 720, the reference form is 382px wide at x=126.72. Its content starts
at y=101; heading at y=165; primary buttons at y=293 and y=343; email field at
y=425; submit at y=479. The right panel is x=639.44, y=12, 628.56 × 696 with a
20px corner radius. The split begins at a 1100px viewport width.

The form uses a 32/40px heading, 16/24px subtitle, 38px desktop controls,
12px control radii, 44px between logo and heading, and 56px before providers.
The right panel uses `height: calc(100dvh - 24px)` and
`width: min(calc(90.311dvh - 21.675px), calc(100vw - 496px))`.
Mobile collapses to a centered form with 20–24px side padding and at least 44px
touch controls on phones. Reference white and charcoal take precedence over
the skill's default tinted-neutral preference.

## Original Telos carousel

All five runtime images are regenerated with the built-in image generator.
Approved T and the Telos mark were supplied as identity references. No reference
artwork remains in the public asset directory. Source images are retained under
`source-images/` for design comparison only.

| Image | Scene | Runtime file |
| --- | --- | --- |
| 01 | T at a warm studio desk with the Telos mark | `/auth/telos-v1/01-world-models.webp` |
| 02 | T collecting notes and media in a Telos folder | `/auth/telos-v1/02-save-anything.webp` |
| 03 | T on a lawn, paired with a felt character sticker | `/auth/telos-v1/03-skills.webp` |
| 04 | T working in a cafe with a Telos laptop | `/auth/telos-v1/04-creative-partner.webp` |
| 05 | T Polaroid, planning notes and a wooden Telos mark | `/auth/telos-v1/05-ai-studio.webp` |

Original PNGs and generation records live in `generated/`. Runtime WebPs retain
their native dimensions and use quality 88. Titles are HTML text in seven
languages; they are not baked into artwork. Slides advance every six seconds,
pause on hover/focus or hidden tabs, and stop autoplay for reduced motion.

Google, GitHub, Discord and Slack continue to use the existing authentication
integrations. The visual reference's Apple button is not exposed because this
project does not provide that provider. Email continues to use magic links.

## Verification limits

All five original and optimized images were visually inspected. Scoped lint,
callback regression tests, the production build, asset metadata and locale
coverage are checked separately. The finesse static detector reports no P0;
its pure-white and TSX stamp hints are intentional because the stamp lives in
the CSS module and the user requested the reference's white canvas.

The local page could not be inspected in the browser: its origin permission
continued to reject access after the user's permission change. Do not interpret
static checks or the successful build as screenshot verification of the page.
