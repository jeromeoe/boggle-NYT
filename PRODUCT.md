# Product

## Register

product

## Users
Word-game enthusiasts and competitive puzzle players — the Scrabble / NYT-Games / Woogles crowd. They arrive to play a fast, daily, ranked round of Boggle, compare scores on a leaderboard, and (increasingly) challenge friends. Context is a quick session (1–3 minutes of play) on desktop or phone, often returning daily for the shared board. A meaningful share of traffic is logged-out first-timers deciding whether to create an account.

## Product Purpose
Moggle (Boggle.WEB) is a premium browser Boggle: find as many valid words as possible on a 4×4 grid within a timer, scored against the full CSW24 dictionary via a Trie solver. Modes span Blitz (1 min), Rapid (3 min), and a ranked Daily Challenge, plus Practice (Microboards, Zen), Puzzles, and Beta multiplayer/friends/mail. Success = daily-active returning players, daily-challenge completion, and account signups converting from the logged-out landing.

## Brand Personality
"Intellectual Play." Considered, literary, confident — a quiet club for people who like words. Three words: literary, composed, competitive. Voice is plain and self-assured, never cutesy. The emotional goal is the focused calm of a good crossword, with a competitive edge at score/leaderboard moments.

## Anti-references
Generic SaaS dashboards (hero-metric templates, identical icon-card grids). Loud, gamified, neon "casual game" aesthetics (Candy-Crush juice, confetti, cartoon mascots). Cluttered ad-heavy puzzle portals. The current build leans on a cream/parchment + forest-green + gold palette that risks reading as the 2026 "warm-neutral premium template"; distinctiveness should come from typography, the board, and motion — not from the warm body background by default.

## Design Principles
- **The board is the hero.** Every screen defers to the play surface; chrome stays quiet so the grid and score lead.
- **Earn the timer's calm.** Reduce cognitive load before play, raise intensity during it. Match the emotional register to the moment.
- **One confident path.** Primary action per screen is unmistakable (Play Today's Board); secondary actions recede.
- **Responsive is not optional.** The product is played as much on phones as desktops; the same app-shell must collapse gracefully, not ship desktop-only.
- **Quietly literary, never decorative.** Serif display + mono labels carry the identity; avoid decorative gloss (gradients, glass) that doesn't serve play.

## Accessibility & Inclusion
Target WCAG 2.1 AA. Honor reduced motion (already wired via `data-reduced-motion`). Known risk areas: muted-gray body text on tinted/cream and on dark surfaces (contrast), color-only status cues (online dots, win/loss), and full keyboard operability of the board and modals. Dark mode is supported and must hold AA on its own.
