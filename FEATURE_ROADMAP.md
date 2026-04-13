# WordHaven — Feature Roadmap

> Created: 2026-04-04 | Living document for planned features and improvements
> Pivot: 2026-04-13 | Transitioning from "Boggle.WEB" to a premium, multi-game "Word Game Hub"

---

## Vision
Transform the application into a premium "Chess.com for Word Nerds". A central platform that offers multiple competitive word games under a single unified player profile. 
The platform will feature two main games initially:
1. **Word Grid** (Fast-paced, pattern recognition game similar to Boggle)
2. **Crossword Wars** (Deep, highly competitive, tile placement game similar to Scrabble)

*Note on Copyright: To avoid Cease and Desist letters from Hasbro/Mattel, we will rigorously avoid the trademarked names "Boggle" and "Scrabble" in user-facing copy, and ensure the UI/board designs are distinct from the physical board games.*

---

## 1. Platform & Core Infrastructure (The "Hub")

**Goal**: Build a robust, scalable backend that supports multiple game types, a unified player profile, and a social system.

### Unified Player Profiles (`/profile/:username`)
- Single profile displaying global rank across all games.
- **Word Grid ELO** and **Crossword Wars ELO**.
- Universal friends list.
- Comprehensive stats and heatmap of play activity.

### Universal Social & Matchmaking System
- **Friends System**: Send/accept friend requests, see online presence across the whole platform.
- **Lobby System**: Players can challenge friends to a specific game type (e.g., "Jerome challenged you to a 3-minute Word Grid").
- **Ranked Matchmaking**: Global queue system with ELO-based matchmaking algorithms and Bot Gatekeepers for low-population tiers.

### Supabase Architecture Pivot
- Instead of a `boggle_matches` table, create a generic `matches` table with a `game_type` column (`word_grid`, `crossword_wars`).
- Shared dictionaries and verification logic on the backend.
- Core Tables: `users`, `friends`, `player_stats`, `matches`, `match_players`.

---

## 2. Game 1: Word Grid (Fast-Paced Modes)
*(The mechanics previously known as Boggle)*

**Goal**: A highly interactive, kinetic, rapid-fire pattern recognition game.

### Solo Mastery (Practice Mode)
- **Timed Mode**: 3-minute frenetic score attacks.
- **Untimed / Solver Mode**: Finding all possible words on the board, with hints and solution paths.
- **2x2 Sub-Grid Training**: Focused practice on smaller sectors.

### Multiplayer Clashes
- Real-time shared seed boards via Supabase Realtime.
- Fast rounds (1, 3, or 5 minutes).

### Mobile UI & Path Visualization
- **Mobile Swiping**: Form words by swiping across tiles rather than tapping.
- **Dynamic Pathing**: Show the lines connecting letters in real time as the player types or swipes. 

---

## 3. Game 2: Crossword Wars (Competitive Mode)
*(The mechanics previously known as Scrabble)*

**Goal**: A deep, strategic, highly competitive multiplayer game appealing to the tournament Scrabble crowd currently underserved by dated platforms.

### Core Mechanics
- Real-time multiplayer board synchronization.
- Tile rack management and drawing logic from a shared/server tile bag.
- Official dictionary verification (CSW21 or NWL20 equivalents).
- Premium squares (Double Letter, Triple Word, etc. – layout must differ visually from original Scrabble).

### Advanced Analytics (Monetization Driver)
- **Post-Game Analysis Engine**: A system showing the mathematically optimal move the player missed (similar to "Quackle").
- **Opening Move Heatmaps**.
- **Missed Bingos Tracker**.
- **Dictionary Stats**: Highlighting high-value words the player consistently misses or has never played.

---

## 4. Monetization & Growth Strategy 

**Goal**: Create a sustainable freemium model that respects the player base while providing high-value analytics.

### Freemium Cosmetics System
- **Free**: Default refined UI (Light/Dark mode, beautiful typography).
- **Premium ($X/mo or one-time purchases)**:
  - Custom board themes (Wood, CRT, Synthwave).
  - Custom tile sounds (Mechanical keyboard, ASMR pops).
  - Lobby flair, animated avatars, and profile borders.

### Subscriptions for Analytics
- Core gameplay is 100% free and mathematically level.
- "Pro" tier grants unlimited access to the Crossword Wars post-game analyzer and deep Word Grid history stats.

### SEO & Product-Led Growth
- Shareable replay links (`wordhaven.com/replay/123`).
- Emojis-based post-game sharing (`🟦 🟨 🟩 🟩` Wordle style).
- Content marketing via "Word of the Day" or strategy guides for the Crossword Wars crowd.

---

## Priority & Sequencing

| Phase | Focus | Description |
|-------|-------|-------------|
| **Phase 1** | Platform Foundation & Branding | Rename project, restructure Next.js routing (`/word-grid`, `/crossword-wars`, `/profile`). Setup generic Supabase auth/profile schema. |
| **Phase 2** | Word Grid Polish | Complete the current game loop: add mobile swiping (touch events), dynamic path highlighting, PWA support. |
| **Phase 3** | Social & Matchmaking Hub | Implement Friends System, real-time presence (online/offline), and the generic ELO matchmaking queue. |
| **Phase 4** | Crossword Wars MVP | Build the tile-placement engine: interactive board with premium squares, tile rack, exchanging tiles, dictionary validation. |
| **Phase 5** | Analytics & Monetization | Build the post-game analyzers, ELO tracking charts, and launch the cosmetic shop. |

---

## Open Questions

- [ ] **Dictionary Licensing**: Need to determine which dictionary to use for Crossword Wars (NWL20/CSW21) and check open-source/usage rights for web games.
- [ ] **Domain Name**: "Wordnerds"? Need to secure a domain and update Next.js metadata.
- [ ] **Rank ELO Scaling**: Should the two games use the same starting ELO (1200) or have different baseline curves?
- [ ] **Hint System**: In Word Grid solo mode, do hints reveal the word, the starting tile, or the path?
