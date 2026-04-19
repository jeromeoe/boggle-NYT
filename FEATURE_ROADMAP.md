# Wordseekers — Feature Roadmap

> Created: 2026-04-04 | Living document for planned features and improvements
> Pivot: 2026-04-13 | Transitioning to a premium, multi-game "Word Game Hub"

---

## Overarching Implementation Plan

To get from our current state to a fully monetized, secure, and populated platform, we will follow these sequential phases:

1. **Secure the App (Foundation)**: Lock down Supabase with strict Row Level Security (RLS) policies to ensure basic user data and matches are safe from casual manipulation.
2. **Expand the Core Engine**: Add ELO matchmaking logic, implement Scrabble (Crossword Wars) logic using the CSW24 dictionary, and flesh out the core gameplay features discussed. 
3. **Revamp the Site (Architecture & UI)**: Build robust slugs (`/wordgrid`, `/crosswordwars`, `/profile`), upgrade the front-end layout for a "chess.com-esque" feel, and add a dark mode toggle.
4. **Boost Marketability (Viral Features)**: Implement shareable replay links, seeded board sharing, shorter timers for high replayability, and a unified Friends/Duel system. 
5. **Mobile-First Optimization**: Polish the UI so the entire application feels native on mobile browsers (swipe-to-select, touch-friendly scaled tiles, bottom-sheet layouts). 
	**5.5. Unobtrusive Ads**: Integrate a discrete banner ad service to begin baseline monetization of the early user base.
6. **Marketing Execution (Early Users)**: Launch to a seeded group (NTU Boggle captains), then discretely push to highly relevant subreddits (`r/scrabble`, `r/boggle`). Build a community via a Discord widget embedded directly in the site, and push to LinkedIn.
7. **REALLY Secure the App (Cheat Prevention)**: Transition to a fully Server-Side Authoritative backend. Validate every word and path on the server-side to prevent memory-injection or botting scripts from dominating the ELO ladders. Include ethical hacking/penetration testing against our own endpoints.
8. **App Store Rollout**: Package the web application for iOS and Android. Use specific app store SEO strategies and push current active web users to download the app. 
9. **Freemium & Analytics Rollout**: Launch the "Membership Package" logic. Paying users get an ad-free experience plus deep post-game analytical tools (heatmaps, missed optimal plays, Quackle-style review).

---

## Vision
Transform the application into a premium "Chess.com for Word Nerds". A central platform that offers multiple competitive word games under a single unified player profile. 
The platform will feature two main games initially:
1. **Word Grid** (Fast-paced, pattern recognition game)
2. **Crossword Wars** (Deep, competitive, tile-placement game using CSW24)

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
- **Lobby System**: Players can challenge friends to a specific game type.
- **Ranked Matchmaking**: Global queue system with ELO-based matchmaking algorithms. **Include Top 10 Leaderboards** and **"Elo Barrier Bots"** that find a fixed percentage of points (e.g., 20% on open boards) to populate empty queues.

### Supabase Architecture 
- Strict RLS Policies for every single table.
- Shared dictionaries (CSW24) and verification logic on the backend.
- Core Tables: `users`, `friends`, `player_stats`, `matches`, `match_players`.

---

## 2. Game 1: Word Grid (Fast-Paced Modes)

**Goal**: A highly interactive, kinetic, rapid-fire pattern recognition game.

### Solo Mastery (Practice Mode)
- **Timed Mode**: Short timers for frenetic score attacks.
- **Untimed / Solver Mode**: Finding all possible words on the board, with hints and solution paths.
- **2x2 Sub-Grid Training**: Focused practice on smaller sectors.

### Multiplayer Clashes
- Real-time shared seed boards via Supabase Realtime.
- Fast rounds (1, 3, or 5 minutes).

### Mobile UI & Path Visualization
- **Mobile Swiping**: Form words by swiping across tiles.
- **Dynamic Pathing**: Show the lines connecting letters in real time as the player types or swipes. 

---

## 3. Game 2: Crossword Wars (Competitive Mode)

**Goal**: A deep, strategic, highly competitive multiplayer game appealing to the tournament Scrabble crowd.

### Core Mechanics
- Real-time multiplayer board synchronization.
- Tile rack management and drawing logic from a server-side tile bag.
- Official dictionary verification (CSW24).
- Premium squares layout (visually distinct from original board).

### Advanced Analytics (Monetization Driver)
- **Post-Game Analysis Engine**: A system showing the mathematically optimal move the player missed (similar to "Quackle").
- **Opening Move Heatmaps**.
- **Missed Bingos Tracker**.

---

## Open Questions

- [ ] **Rank ELO Scaling**: Should the two games use the same starting ELO (1200) or have different baseline curves?
- [ ] **Mobile Porting**: Will the Phase 8 App Store push use React Native, Capacitor/Ionic, or a standardized PWA wrapper?
