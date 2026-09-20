# Telos landing v2

User-approved navy mullet T, warm ivory background, oversized typography, three sections: introduction, interactive capabilities, start a conversation. Original TelosLogo retained in navigation and footer.

Interactions: native anchor scrolling, three scene selectors with matching images, localized prompt prefilling, auth-aware chat submission, mobile menu with Escape support, reduced-motion support.

All 39 LandingStudio keys align across seven locales. English and Simplified Chinese are authored; the other five currently use English fallbacks. Run `pnpm --filter ./apps/web translate` to translate via the existing incremental script (not run during this redesign).

Assets are in `apps/web/public/landing/t-v2/`; PNG originals and compressed WebP derivatives are both retained. Exact imagegen prompts are in image-prompts.md.

Validation: 39 web tests passed; web and agent-service production builds passed; ESLint has zero errors and three existing unrelated warnings. Browser checks covered Chinese and English desktop layouts, 390px mobile layout, menu dismissal, scene changes, prompt prefilling and encoded sign-in callback. No horizontal overflow observed. Authenticated conversation execution was not verified against the local database.

Default T persona source removes 看板娘. Persistence uses the existing startup synchronization; the agent service was not restarted or its database updated during this task.

Local preview: http://localhost:8800/zh/ . No commit, push or deployment performed.
