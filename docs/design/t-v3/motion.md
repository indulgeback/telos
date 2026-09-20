# Landing motion pass

References visited: Awwwards Scrolling collection (https://www.awwwards.com/websites/scrolling/), its featured illoca / Unseen Studio site (https://illoca.unseen.co/), and CSS Design Awards Access IS case (https://www.cssdesignawards.com/sites/access-is/33909/). Adapted ideas: staged typography, scroll-responsive scene framing, spatial feedback on interactive cards. No reference assets or code copied.

Implementation uses existing GSAP / @gsap/react dependencies and scoped matchMedia / ScrollTrigger contexts. No Lenis, scroll interception or pinning. Adds staggered hero entry, scroll-linked scene scale and image parallax, viewport-gated floating light points, chapter entrances, pointer-following tilt/light, category transition, button arrow and composer-avatar feedback. A localized pause/play control restores static content. System reduced-motion skips GSAP setup and CSS motion. Listeners, resize observer and animations revert on unmount or pause.

Checks: web production build, TypeScript and targeted ESLint pass; 39 web tests pass. Browser verified nonzero changing scene transforms, pointer tilt/light variables, pause removing inline transforms, resume, 390px layout and prompt selection. Runtime error log empty during checks. OS reduced-motion is implemented via media query but was not toggled in the host settings during testing.
