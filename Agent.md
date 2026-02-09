# Boggle Experience Architecture

> **ROLE:** Act as a Lead Product Designer & Engineer for a viral word game platform.
> **OBJECTIVE:** Build "Boggle" — a premium, standalone word game experience rivalling Wordle and NYT Games.

## 1. Vision & Aesthetic
*   **Vibe:** "Intellectual Play". Clean, tactile, and highly responsive. Think NYT Games meets Linear-style productivity tools.
*   **Design Language:**
    *   **Typography:** Strong serif headers (e.g., *Fraunces* or *Playfair Display*) mixed with clean sans-serif UI (e.g., *Inter* or *Geist*).
    *   **Color Palette:** Off-whites (cream/parchment) for the board, deep forest greens/midnight blues for branding, and high-contrast accents for gameplay states.
    *   **Motion:** Subtle, physics-based interactions. Tiles should feel "heavy" when dropped. Modals should spring into place.
    *   **Avoid:** Generic "tech" aesthetics (no neon glow, no glassmorphism for the sake of it). Focus on readability and elegance.

## 2. Core Features (Roadmap)
### Phase 1: The Foundation (✅ Complete)
*   **Single Player Engine:** Robust Trie-based solver with CSW24 dictionary.
*   **Performance:** Instant word validation and zero-latency board generation.
*   **Responsive Board:** A tactile 4x4 grid that works perfectly on mobile touchscreens and desktop keyboards.
*   **Modular Architecture:** Atomic components (Board, Tile, Timer, Controls, WordInput, FoundWordsList).
*   **Prominent Scoring:** Hero-style score display with real-time updates and visual feedback.
*   **Authentication:** Username/password auth via Supabase (email only for password reset to minimize email usage).

### Phase 2: Persistence & Social (In Progress)
*   **User Accounts:** Full authentication system with persistent stats tracking.
*   **Game History:** Store all games in Supabase with board states, scores, and word lists.
*   **Daily Challenge:** A seeded board that resets every 24 hours (UTC midnight). All players compete on the same board.
*   **Leaderboards:** Real-time rankings for daily challenges with automatic rank updates.
*   **Post-Game Analysis:** 
    *   Visual "heat maps" of where words were found on the board.
    *   Percentile ranking based on score.
    *   "Missed Opportunities" list showing the highest-scoring words you didn't find.
*   **Statistics Dashboard:** Persistent user stats (Streak, Win %, Average Score, Total Words Found).

### Phase 3: Advanced Features (Future)
*   **Multiplayer Lobbies:** Real-time 1v1 or Group battles using Supabase Realtime.
*   **Shareable Results:** "Wordle-style" share grid (emoji representation of your score).
*   **Achievement System:** Badges for milestones (100 words found, 30-day streak, etc.).

## 3. Tech Stack
*   **Framework:** Next.js 14+ (App Router)
*   **Language:** TypeScript (Strict)
*   **Styling:** Tailwind CSS + Framer Motion (for animations)
*   **Backend:** Supabase (Auth, Database, Realtime)
*   **Auth:** Custom username/password system with bcrypt hashing
*   **State:** React Hooks (Context/Zustand for complex state if needed)

## 4. Architecture & File Structure
```
/src
  /app                   # Next.js pages
  /components
    /game                # Board, Tile, Timer, Controls, WordInput, FoundWordsList
    /analysis            # ResultsReport, Charts, Heatmaps
    /auth                # AuthModal, UserProfile
    /shared              # NoiseOverlay, common UI components
  /hooks                 # useGameLogic, useAuth, useTimer
  /lib
    /boggle              # Core game logic (solver, generator, scoring, dice, analytics)
    /supabase            # Supabase client, auth helpers, database queries
  /workers               # Web Worker for dictionary loading (if needed)
/sql                     # Database schemas, policies, and functions
```

## 5. Database Schema
*   **users**: User accounts with username/password authentication
*   **game_stats**: Individual game records with scores, words, and board states
*   **daily_challenges**: Daily board configurations with seeds
*   **daily_leaderboard**: Rankings for daily challenges with auto-updating ranks

See `/sql/*.sql` files for complete schema, RLS policies, and database functions.

## 6. UI Layout
*   **3-Column Desktop Layout:**
    *   **Left Panel (Score Hero):** Prominent score display (7xl font), timer, and session stats
    *   **Center Panel:** 4x4 Boggle board with game controls
    *   **Right Panel:** Word input and found words list
*   **Mobile:** Stacked layout with collapsible panels
*   **Header:** Logo, score badge, user menu, and GitHub link

## 7. Coding Standards
*   **Functional purity:** Keep game logic separate from UI components.
*   **Accessibility:** Full keyboard navigation support and ARIA labels for screen readers.
*   **Performance:** Dictionary loading optimized for fast initial load.
*   **Security:** Row Level Security (RLS) enabled on all Supabase tables.
*   **Type Safety:** Strict TypeScript with proper interfaces for all data structures.

## 8. Environment Variables
Create `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 9. Deployment Checklist
- [ ] Run SQL migrations in Supabase dashboard (in order: 01, 02, 03)
- [ ] Set environment variables in deployment platform
- [ ] Configure CORS settings in Supabase
- [ ] Test authentication flow (signup, signin, signout)
- [ ] Verify RLS policies are working correctly
- [ ] Test daily challenge generation and leaderboard updates

