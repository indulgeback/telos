# T v4 — Hooded terminal companion

Selected direction: B. Adult female character with charcoal bob, oversized ivory hood, sage cursor patch and dark relaxed trousers. Portrait and four illustrations are generated original assets, delivered as source PNG and WebP. Old design archives remain historical references; runtime landing references now point to /brand/t-v4. Admin and web legacy telos-ip.png entry points receive the new portrait. The Telos corporate wordmark remains a separate identity.

The Skills and Agents collection banners now use the same B character (`gather.webp` and `hero.webp`). Their images are aligned toward the right and cropped near the top to preserve the face beside the existing text panel. The previous `skills-hero-t.png` and `agents-hero-t.png` files remain on disk for historical reference but have no runtime source references.

The landing page keeps functional prompt handoff, scene filtering, session routing and reduced-motion handling. Login retains magic-link and all four social providers, with an illustration/form desktop split and a single-column phone layout.

Persona changes are source-only: default-agent startup synchronization applies instructions when the service next runs. No production restart or database change was performed.

Validation: agent-service TypeScript build; web TypeScript and changed-file ESLint; three landing routing unit tests; desktop 1440px and phone 390px browser rendering, no horizontal overflow. OAuth delivery and actual email sending were not exercised.
