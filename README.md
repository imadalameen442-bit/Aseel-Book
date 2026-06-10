# "For Aseel" — An Interactive Storybook Gift

## Overview
A personal, heartfelt gift: a digital book with real 3D page-turn animation, written by the author for his friend Aseel (who is writing him a physical book in return — the gift is the symmetry). It is a 26-face storybook of "evidence" — specific things he has seen her do that she never gives herself credit for — woven with inside jokes (chess record, cat stickers), her loves (cats, rain, motorcycles), interactive moments, synthesized sound, and a finale bloom. Deployment target: **GitHub Pages** (a link he can send her).

## Tech
Plain HTML + CSS + vanilla JS, **no build step**. One optional CDN dependency: [anime.js v3](https://animejs.com) for particle bursts and springy micro-interactions — if the CDN is unreachable, everything degrades gracefully to the CSS fallbacks. All sound is synthesized live with the Web Audio API (no audio files), never autoplays, and has a global mute (persisted).

## Deploying to GitHub Pages
1. Push this folder to a GitHub repo (it already has `index.html` at the root).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
3. The book goes live at `https://<username>.github.io/<repo>/` within a minute or two. Send her the link.

## Structure: How the Book Works
- The book is a stack of 13 `.leaf` elements inside `#book`. Each leaf has a `.page.front` and `.page.back` (the back is pre-rotated 180° with `backface-visibility: hidden`).
- Page size: **520 × 680 px** per page (1040 × 680 spread), CSS vars `--page-w` / `--page-h`. The whole `.book-wrap` is scaled to fit the viewport by `fit()` in `book-engine.js`.
- Flipping = adding `.flipped` (rotateY(-180deg), `transform-origin: left center`, 1100ms). Z-index is managed per-leaf; the animating leaf gets a temporary top z-index until `transitionend`.
- **Desktop**: two-page spreads; when fully closed the book translates ±¼ width so the visible cover is centered.
- **Mobile (≤720px)**: single-page mode — the unit of navigation is one page *face*. Advancing from a right page flips the leaf; from a left page it pans the book across the spread. Swipe left/right to turn. Position converts cleanly between modes (persisted as a face index in `aseel-book-pos`).
- Clicking a right page advances, a left page goes back; interactive regions opt out with `data-no-flip`. Arrow keys / space also navigate.

## Pages (26 faces, in order)
1. **Cover** — rose cloth, cat emblem, "tap the cover to open".
2. **Inside cover** — Ex Libris bookplate.
3. **Title page** — "The Aseel I Know"; hint that pages hide things.
4. **Dedication** — paper vs. pixels.
5. **Chapter I intro** — "What I see (that you don't)".
6. **Exhibit A: You show up** — daily effort; steadiness.
7. **Exhibit B: Heavy chapters** — hardships, handled gently (no specifics; author should personalize).
8. **Exhibit C: Kindness** — with margin note teasing the chess page.
9. **Exhibit D: Proud stamps** *(interactive)* — wax-seal button stamps ink phrases; ink-fleck burst + thump; persists (`aseel-stamps`).
10. **Exhibit E: Spanish class** — the loud presentation.
11. **Exhibit F: Your voice** *(interactive)* — chorus page; "tap to hear what I hear" releases floating music notes + pentatonic plucks.
12. **The Encore** — she hears mistakes, the audience hears the song.
13. **Exhibit G: You think no one notices** *(interactive)* — paperclip reveals 4 "noticed:" notes.
14. **Chess record** *(interactive)* — Aseel 1 vs ∞; starred square bursts confetti flecks and reveals the rematch note.
15. **Cat stickers** *(interactive)* — peel & place; springy settle; persists (`aseel-stickers`).
16. **Rain** *(interactive)* — falling-drop window + cat; "tap for rain" toggles synthesized rain ambience (stops on page turn).
17. **Cat field guide** — five-star reviews of Aseel, by cats.
18. **Pet the cat** *(interactive)* — tap to slow-blink, purr (synthesized), float hearts; purr count persists (`aseel-purrs`).
19. **Illuminated quote** — gold-framed manuscript page; Marie Curie ("gifted for something"); alternates left in an HTML comment.
20. **Why that quote** — the book's thesis: whatever she puts her mind to, she gets.
21. **The Official Forecast** *(interactive)* — Dept. of Inevitable Outcomes; seal certifies 5 predictions one at a time (persists, `aseel-forecast`).
22. **Guarantee** — warranty-card humor, sincere last line.
23. **The road** — graduation/leaving; distance is just geography.
24. **Write back** *(interactive)* — her page; persists locally (`aseel-reply`); private.
25. **Bloom finale** *(interactive)* — bud blooms 8 petals + 34-petal particle burst + soft arpeggio, then "I'm proud of you, Aseel."
26. **Back cover** — "the end. (rematch pending)".

Ambient: 8 drifting petals (`#ambient`), disabled under reduced motion.

## Sound (all Web Audio synthesis, zero files)
| Sound | Trigger |
|---|---|
| Page rustle (filtered noise sweep) | every page turn |
| Pluck notes (triangle osc) | voice page, sticker place, chess win, bloom arpeggio |
| Seal thump (sine drop) | proud stamps, forecast certify |
| Purr (LFO-modulated lowpassed noise) | petting the cat |
| Rain (filtered noise loop) | rain page toggle; auto-stops on page turn |

Global `♪ on/off` toggle in the nav bar, persisted as `aseel-sound`.

## Design Tokens
**Palette (rose — hardcoded via `data-palette="rose"`; lavender/sage overrides still exist in CSS):**
- Paper `#f8f1e4` · Ink `#4a3c30` · Accent `#c0758a` / deep `#8e4d62` · Cover `#8f4d5f` · Stage `#2b2125`
- Illuminated page gold: `#c9a25f` / `#b08a4f`

**Typography (Google Fonts):** EB Garamond (body 21.5px/1.62, h2 38px italic) + Caveat (hand notes). Kickers 13px / 0.3em tracking.

`prefers-reduced-motion` disables flips/ambient/rain-drops/particles; the book stays fully usable.

## State (localStorage keys)
| Key | Purpose |
|---|---|
| `aseel-book-pos` | current **face index** (0 = cover; works across mobile/desktop) |
| `aseel-stamps` | proud-stamps revealed |
| `aseel-stickers` | placed sticker indices (JSON) |
| `aseel-purrs` | pet-the-cat counter |
| `aseel-forecast` | certified predictions |
| `aseel-reply` | her typed message |
| `aseel-sound` | `on` / `off` |

## Editing the Words
All draft copy the author intends to personalize is marked with `<!-- ✏️ EDIT -->` comments in `index.html` — including the quote page (Curie, with Goethe/Mandela alternates in the comment), the forecast predictions, and the cat reviews.

## Files
- `index.html` — all page markup (13 leaves), nav, anime.js CDN tag
- `book-styles.css` — styling, palettes, animations, mobile mode
- `book-engine.js` — flip engine (desktop + mobile), sound synthesis, anime.js interactions, ambient
