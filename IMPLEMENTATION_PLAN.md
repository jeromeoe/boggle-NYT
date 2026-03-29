# Boggle.WEB — Implementation Plan
> Generated: 2026-03-29 | Based on project audit + feature requests

---

## Executive Summary

Five work streams are identified below, ordered by priority. **Feature 1 (Auth)** contains a critical
security vulnerability that should be resolved before any public traffic grows further. **Feature 4
(Leaderboard sync)** is a one-file fix and should be done immediately. Features 2, 3, and 5 are
additive improvements.

---

## Feature 1: Auth Overhaul + "Forgot Password?" Email Flow

### Current State & Critical Security Issue

The existing auth system has a **critical vulnerability**: `signIn()` in
`src/lib/supabase/auth.ts` fetches the full user row — including `password_hash` — **to the
browser client**, then calls `bcrypt.compare()` in the browser. This means:

1. The password hash is visible in network traffic to any observer.
2. Any logged-in user can retrieve another user's hash from the Supabase anon key.
3. There is no mechanism to send password reset emails.
4. Sessions live in localStorage with no expiry.

### Recommended Solution: Next.js API Routes + Resend

Keep Supabase as the database (no schema migration needed for users) and fix the security model
by moving all auth logic **server-side**. Add **Resend** for transactional email (3,000
emails/month free, native Next.js SDK).

This is the least disruptive fix: no user data migration, no Supabase Auth overhaul, just moving
the dangerous `SELECT password_hash` query behind a server route.

> **Alternative Considered — Supabase Auth**: Would give built-in reset flow but requires email
> as the primary identifier, forcing a full schema + user migration and breaking the
> username-centric UX. Not recommended at this stage.

### Implementation Steps

#### Step 1 — Add dependencies

```bash
npm install resend zod
```

#### Step 2 — Supabase: add `password_reset_tokens` table

```sql
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the service role can read/write tokens; anon role gets nothing
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon access" ON password_reset_tokens FOR ALL USING (false);
```

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (never expose to client).

#### Step 3 — Create API routes

**`src/app/api/auth/signin/route.ts`**
- Accept `{ username, password }` via POST
- Query user by username using the **service role client** (server-only)
- Run `bcrypt.compare()` server-side
- Return a signed session token (JWT with `user_id`, `username`, `exp`) via an `httpOnly` cookie
- Never return `password_hash` to the client

**`src/app/api/auth/signup/route.ts`**
- Accept `{ username, password, email?, displayName? }` via POST
- Validate with Zod
- Hash password server-side
- Insert user via service role client

**`src/app/api/auth/forgot-password/route.ts`**
- Accept `{ username }` via POST
- Look up user's email; if none on file, return a generic "if that account exists, an email was sent" (prevents user enumeration)
- Generate a cryptographically secure token: `crypto.randomBytes(32).toString('hex')`
- Store `sha256(token)` in `password_reset_tokens` table (store hash, not plaintext)
- Send email via Resend:

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Boggle.WEB <noreply@yourdomain.com>',
  to: user.email,
  subject: 'Reset your Boggle.WEB password',
  html: `<p>Click <a href="${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}">here</a> to reset your password. Link expires in 1 hour.</p>`
});
```

**`src/app/api/auth/reset-password/route.ts`**
- Accept `{ token, newPassword }` via POST
- Hash the incoming token, look up the record, verify `expires_at` and `used = false`
- Hash new password, update `users.password_hash`, mark token as `used = true`

**`src/app/reset-password/page.tsx`**
- Reads `?token=` from URL, shows a form with "New Password" + "Confirm Password"
- On submit, calls the reset API route
- Redirects to home with a success message on completion

#### Step 4 — Update client-side auth calls

- Replace direct Supabase calls in `src/lib/supabase/auth.ts` with `fetch('/api/auth/signin', ...)` etc.
- Replace localStorage session with a call to `/api/auth/me` (reads the httpOnly cookie) on mount
- Keep the shape of the `user` object returned to the UI the same to minimize component changes

#### Step 5 — Update AuthModal

Add a third "mode" state: `"forgot"`. When `mode === "forgot"`:
- Show only an email/username field
- Show a "Send Reset Email" button
- Show confirmation text after submission: "If that account has an email on file, a reset link was sent."
- Add a small "Forgot username or password?" link in sign-in mode below the submit button

#### Step 6 — Session security improvements

- `httpOnly` cookie for the session JWT prevents XSS access
- Set `secure: true` and `sameSite: 'lax'` in production
- Add a 30-day expiry; refresh on each authenticated request

---

## Feature 2: "Start New Game" Mode Selector Popup

### Scope

When the user clicks **"Start New Game"**, instead of immediately starting a game, a modal
appears letting them choose the game type. The modal matches the existing aesthetic exactly
(dark green header, parchment `#F9F7F1` body, spring entrance animation via Framer Motion).

### Board Type Definitions

The terms "Open Board" and "Closed Board" refer to **generated word density**:

| Mode | Word Count Target | Description |
|---|---|---|
| **Open Board** | ≥ 80 words | High-vowel, many intersections. Regenerates until threshold is met. Approachable. |
| **Closed Board** | 40–65 words | Tighter consonant layout. Fewer words, each worth more. Challenging. |
| **Random** | No filter | Pure dice roll. Current default behavior. Fast. |

Generation for Open/Closed works by looping `generateBoard()` + `findAllWords()` until the word
count falls in the target range. This runs in the existing Web Worker thread to avoid blocking UI.
Cap retries at 50 to prevent infinite loops on pathological seeds.

### Full Mode Menu (from CREATIVE_IDEAS.md)

```
┌──────────────────────────────────────────────────────┐
│  BOGGLE.WEB  — Choose Your Game                      │
├──────────────────────────────────────────────────────┤
│  ● Classic Boggle           ← active                 │
│    └─ Open Board   (≥ 80 words, approachable)        │
│    └─ Closed Board (40–65 words, challenge)          │
│    └─ Random       (pure dice roll)                  │
│                                                      │
│  ○ Blitz Mode               ← Coming Soon badge      │
│    Time attack: every word buys more time            │
│                                                      │
│  ○ Big Boggle               ← Coming Soon badge      │
│    5×5 grid, longer words, higher scores             │
└──────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1 — Add board generation helpers to `src/lib/boggle/dice.ts`

```ts
export async function generateOpenBoard(trie: Trie): Promise<string[][]> {
  for (let i = 0; i < 50; i++) {
    const board = generateBoard();
    if (findAllWords(board, trie).size >= 80) return board;
  }
  return generateBoard(); // fallback
}

export async function generateClosedBoard(trie: Trie): Promise<string[][]> {
  for (let i = 0; i < 50; i++) {
    const board = generateBoard();
    const count = findAllWords(board, trie).size;
    if (count >= 40 && count <= 65) return board;
  }
  return generateBoard(); // fallback
}
```

#### Step 2 — Add `GameModeModal` component

**File**: `src/components/game/GameModeModal.tsx`

Props:
```ts
interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'open' | 'closed' | 'random') => void;
  isGenerating: boolean;
}
```

Visual: three card options in a row/column. Active modes have a hover/select state.
"Coming Soon" modes are grayed out with a `SOON` badge.

#### Step 3 — Update `useGameLogic.ts`

Add a `startGame(mode: 'open' | 'closed' | 'random')` parameter:

```ts
const startGame = useCallback(async (mode: 'open' | 'closed' | 'random' = 'random') => {
  if (!trie) return;
  setIsGeneratingBoard(true);

  let newBoard: string[][];
  if (mode === 'open') newBoard = await generateOpenBoard(trie);
  else if (mode === 'closed') newBoard = await generateClosedBoard(trie);
  else newBoard = generateBoard();

  // ... rest of start logic unchanged
}, [trie]);
```

Add `isGeneratingBoard` to the returned state so `GameControls` can show a spinner.

#### Step 4 — Update `page.tsx` + `GameControls`

- Add `showModeModal` state to `page.tsx`
- `GameControls.onStart` → sets `showModeModal = true` instead of calling `startGame` directly
- `GameModeModal.onSelectMode(mode)` → calls `startGame(mode)`, closes modal
- Keep the existing "Enter Custom Board Layout..." link unchanged

---

## Feature 3: Bug Fixes (from Audit)

### 3a — Critical: Client-side password verification
**File**: `src/lib/supabase/auth.ts:40-54`
**Fix**: Covered entirely by Feature 1 API route migration.

### 3b — Stale closure in `endGame`
**File**: `src/hooks/useGameLogic.ts:82-120`

`endGame` references `foundWords`, `penalizedWords`, `timeLeft`, etc. via closure.
Because these are updated by React state, the effect that calls `endGame` when the timer hits 0
can capture stale values.

**Fix**: Use refs to mirror the state values that `endGame` needs:

```ts
const foundWordsRef = useRef<string[]>([]);
const penalizedWordsRef = useRef<string[]>([]);
// Keep these in sync:
useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
useEffect(() => { penalizedWordsRef.current = penalizedWords; }, [penalizedWords]);
```

Then read from `*Ref.current` inside `endGame` instead of the state variables. This removes
`foundWords` and `penalizedWords` from the `endGame` dependency array, breaking the cascade.

### 3c — Timer end effect missing `endGame` in deps
**File**: `src/hooks/useGameLogic.ts:76-80`

```ts
// Before — endGame is stale closure
useEffect(() => {
  if (gameActive && timeLeft === 0) endGame(false);
}, [gameActive, timeLeft]); // endGame missing from deps

// After — use the ref approach, or add endGame to deps with useCallback
useEffect(() => {
  if (gameActive && timeLeft === 0) endGame(false);
}, [gameActive, timeLeft, endGame]);
```

With the ref fix from 3b, `endGame`'s deps array stabilizes (no re-creation on every word found),
so adding it here won't cause a loop.

### 3d — Unused variables
- **`src/lib/boggle/solver.ts`**: Remove the imported `Position` type if it's not used in the file
- **`src/lib/supabase/leaderboard.ts`**: Remove the unused `GameStats` import from `./client`

### 3e — Loose `any` typing
Priority replacements:

```ts
// src/app/page.tsx:51 — replace any
interface BoggleUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
}
const [user, setUser] = useState<BoggleUser | null>(null);

// src/lib/supabase/auth.ts:8 — replace any return types
export async function signUp(...): Promise<{ user: BoggleUser | null; error: string | null }>
export async function signIn(...): Promise<{ user: BoggleUser | null; error: string | null }>
```

### 3f — Unescaped JSX entities
Replace bare apostrophes and quotes in JSX string content with HTML entities:
- `Don't` → `Don&apos;t`
- `You've` → `You&apos;ve`

These are ESLint `react/no-unescaped-entities` warnings across `AuthModal.tsx`,
`DailyChallenge.tsx`, and practice components.

### 3g — `AnimatePresence` not wrapping modals in `page.tsx`
**File**: `src/app/page.tsx:16` — `AnimatePresence` is imported but never used in the file.

Wrap `ResultsReport`, `AuthModal`, and `LeaderboardModal` render calls:

```tsx
<AnimatePresence>
  {showResults && <ResultsReport isOpen ... />}
</AnimatePresence>
```

This enables exit animations when modals unmount.

---

## Feature 4: Leaderboard / Daily Board Reset Time Mismatch

### Root Cause

Two different time references are used for what should be the same "day":

| Location | Code | Result |
|---|---|---|
| `src/lib/boggle/daily.ts:8-9` | `new Date(); today.setHours(0,0,0,0)` | **Local time** midnight |
| `src/lib/supabase/leaderboard.ts:27` | `new Date().toISOString().split('T')[0]` | **UTC** midnight |

For a user in UTC+5, the leaderboard query uses UTC date `2026-03-29` but the board was
generated for local date `2026-03-29` (which is actually UTC `2026-03-28` until 5 AM local).
Result: leaderboard and board are on different "days" for 5 hours every day.

### Fix: Standardize on UTC everywhere

**`src/lib/boggle/daily.ts`** — remove local-time normalization:

```ts
// Before
export async function getTodaysDailyBoard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // ← local midnight (WRONG)
  const dateStr = today.toISOString().split('T')[0];
  ...
}

// After
export async function getTodaysDailyBoard() {
  const dateStr = new Date().toISOString().split('T')[0]; // ← UTC date (consistent)
  const baseSeed = parseInt(dateStr.replace(/-/g, ''));
  const dayOffset = new Date().getUTCDay() * 7; // ← use getUTCDay() not getDay()
  const seed = baseSeed + dayOffset;
  ...
}
```

**`src/lib/supabase/leaderboard.ts`** — already uses UTC, no change needed.

**`src/hooks/useGameLogic.ts`** — the `hasPlayedDailyToday` check also uses
`new Date().toISOString().split('T')[0]` internally (via `leaderboard.ts`), which is already UTC.
No change needed there.

**Note**: This is a **breaking change** for boards already seeded. Any games saved today before
the fix will be on a different seed than games saved after. This is acceptable given the mismatch
was already causing incorrect behavior. Consider running the fix at a day boundary.

---

## Feature 5: Tech Stack Alignment

The current stack (Next.js 16.1.6, React 19, Tailwind 4, TypeScript 5, Framer Motion 12) is
modern and current. No major upgrades are needed. Targeted additions only:

### 5a — Add `resend` for email (required by Feature 1)

```bash
npm install resend
```

### 5b — Add `zod` for API route validation (required by Feature 1)

```bash
npm install zod
```

Validate all incoming POST bodies in the new API routes. Example:

```ts
const schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});
const result = schema.safeParse(await req.json());
if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
```

### 5c — Supabase type generation

Run once and commit the generated types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

Replace all `any` types on Supabase responses with `Database['public']['Tables']['users']['Row']`
etc. This makes the compiler catch schema drift.

### 5d — Dictionary pre-loading (performance)

**File**: `src/hooks/useGameLogic.ts:36-41`

Currently the dictionary loads on every mount of `useGameLogic`. Move to a module-level singleton
so it only loads once per page session:

```ts
// src/lib/boggle/trie.ts — add at module level
let dictionaryPromise: Promise<{ words: Set<string>; trie: Trie }> | null = null;

export function getDictionary() {
  if (!dictionaryPromise) dictionaryPromise = loadDictionary();
  return dictionaryPromise;
}
```

This eliminates the "INITIALIZING ENGINE..." flash on re-mounts and Practice Mode tab switches.

### 5e — RLS hardening (security)

Ensure the `game_stats` table has a policy preventing score spoofing:

```sql
-- Only allow inserts where user_id matches the authenticated session
-- Since we're using custom auth (not Supabase Auth), enforce via service role only:
-- All writes to game_stats must go through a server-side API route, not the anon key

CREATE POLICY "No anon inserts" ON game_stats FOR INSERT USING (false);
CREATE POLICY "No anon updates" ON game_stats FOR UPDATE USING (false);
```

Then create `src/app/api/game/submit/route.ts` that uses the service role client for score
submission (analogous to the auth API routes).

---

## Priority & Sequencing

| Order | Feature | Reason |
|---|---|---|
| **1** | Feature 4 — Fix UTC mismatch | 2-line fix, stops daily bug immediately |
| **2** | Feature 3d/3e/3f — Lint fixes | Low risk, improves type safety before bigger changes |
| **3** | Feature 1 — Auth API routes + email | Security-critical; do before traffic grows |
| **4** | Feature 2 — Game mode modal | User-facing feature; needs Feature 3 (deps fix) first |
| **5** | Feature 5 — Tech alignment | Ongoing; apply as each feature above is built |

---

## New Files to Create

```
src/
  app/
    api/
      auth/
        signin/route.ts
        signup/route.ts
        forgot-password/route.ts
        reset-password/route.ts
        me/route.ts
      game/
        submit/route.ts          (RLS hardening)
    reset-password/
      page.tsx
  components/
    game/
      GameModeModal.tsx
    auth/
      ForgotPasswordModal.tsx    (or inline as mode in AuthModal)
  lib/
    supabase/
      server-client.ts           (service role Supabase client, server-only)
      database.types.ts          (generated)
```

## Modified Files

```
src/lib/boggle/daily.ts          (UTC fix)
src/lib/boggle/dice.ts           (add generateOpenBoard, generateClosedBoard)
src/lib/supabase/auth.ts         (replace with fetch() wrappers to API routes)
src/lib/supabase/leaderboard.ts  (remove unused GameStats import)
src/lib/boggle/solver.ts         (remove unused Position import)
src/hooks/useGameLogic.ts        (ref fix, startGame(mode), deps fix)
src/components/game/Controls.tsx (onStart triggers modal, not direct game start)
src/components/auth/AuthModal.tsx (add forgot password mode)
src/app/page.tsx                 (GameModeModal state, AnimatePresence, typed user)
```

---

## Environment Variables to Add

```env
# .env.local
SUPABASE_SERVICE_ROLE_KEY=...          # Server-only, for auth + score API routes
RESEND_API_KEY=...                     # Email delivery
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
JWT_SECRET=...                         # For signing session tokens (min 32 chars)
```
