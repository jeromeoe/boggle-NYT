# Daily Challenge System 🎯

## Overview

The Daily Challenge system generates **curated, high-quality Boggle boards** based on the current date. Instead of pure randomness, boards are algorithmically selected for "interestingness" based on various quality metrics.

## How It Works

### 1. **Themed Days**
Each day of the week has a different theme:

| Day | Theme | Focus |
|-----|-------|-------|
| 🔮 Sunday | **Expert** | Maximum difficulty with rare letters |
| 🔗 Monday | **Chains** | Deep word families (e.g., IT → HIT → HITS → SMITH) |
| 🔄 Tuesday | **Anagrams** | Rich anagram sets |
| 🏃 Wednesday | **Marathon** | 300+ words to find |
| 📚 Thursday | **Obscure** | Unusual words and rare letters (Q, X, Z, J) |
| ⚖️ Friday | **Balanced** | Well-rounded challenge |
| ⚡ Saturday | **Sprint** | Quick game, 50-150 words |

### 2. **Board Generation Process**

```
1. Calculate date-based seed (e.g., 2026-02-09 → 20260209)
2. Generate 100 candidate boards using seeds 20260209-20260308
3. Analyze each board for quality metrics
4. Score boards based on today's theme
5. Select the highest-scoring board
```

### 3. **Quality Metrics**

Boards are analyzed for:

- **Total Words**: Sweet spot is 200-350 words
- **Chain Depth**: How many words share roots (e.g., EST → NEST → NESTS)
- **Anagram Richness**: Number of anagram groups with 4+ words
- **Word Length Variety**: Standard deviation of word lengths
- **Obscurity Score**: Presence of rare letters (Q, X, Z, J)
- **Average Word Length**: Longer words = harder difficulty

### 4. **Interest Score Formula**

```typescript
interestScore = 
  + wordCountBonus (max 30)
  + chainDepthBonus (max 35)
  + anagramBonus (max 30)
  + varietyBonus (max 15)
  + obscurityBonus (max 20)
```

## Usage

### In the App

Click **"Play Daily"** on the home screen to start today's challenge.

### Preview via CLI

You can preview daily boards using the CLI script:

```bash
# Preview today's board
npm run daily-preview

# Preview a specific date
npm run daily-preview 2026-02-15
```

Add this to `package.json`:

```json
{
  "scripts": {
    "daily-preview": "ts-node scripts/daily-preview.ts"
  }
}
```

## Implementation Details

### Files

```
src/lib/boggle/
  daily.ts              # Main daily challenge logic
  dice.ts               # Seeded board generation
  analytics.ts          # Chain & anagram analysis

src/components/game/
  DailyChallenge.tsx    # UI banner component

scripts/
  daily-preview.ts      # CLI preview tool
```

### Key Functions

#### `generateDailyBoard(date, candidateCount)`
Generates the best board for a given date.

```typescript
const { board, seed, theme, quality } = await generateDailyBoard(new Date());
console.log(`Theme: ${theme}`);
console.log(`Total Words: ${quality.totalWords}`);
console.log(`Chain Depth: ${quality.longestChainDepth}`);
```

#### `generateBoardWithSeed(seed)`
Creates a deterministic board from a numeric seed.

```typescript
const board = generateBoardWithSeed(20260209);
// Same seed = same board every time
```

## Future Enhancements

- [ ] **Leaderboards**: Global rankings for daily challenges
- [ ] **Streaks**: Track consecutive days played
- [ ] **Achievements**: Badges for special accomplishments
- [ ] **Board Archive**: Browse past daily challenges
- [ ] **Social Sharing**: Share your score with friends
- [ ] **Custom Themes**: Community-suggested board criteria

## Examples

### Chain-Heavy Board (Monday)
```
H   I   T   S
E   D   I   T
A   T   E   D
R   S   E   T
```
**Chains**: HIT → HITS, EDIT → EDITS, SET → SETS → RESETS

### Anagram-Rich Board (Tuesday)
```
S   T   I   E
N   O   T   S
E   M   O   N
D   I   T   E
```
**Anagrams**: STONE/NOTES/TONES, EDIT/TIDE/DIET/DITE

### Marathon Board (Wednesday)
```
E   R   I   T
S   A   T   E
N   O   I   L
D   G   H   S
```
**400+ possible words** for an extended challenge

## Tips for Players

1. **Know the theme** - Each day favors different strategies
2. **Look for patterns** - Chains and anagrams score big
3. **Start with common roots** - Build from 3-4 letter bases
4. **Save rare letters** - Q, X, Z boards are special!

---

Built with ❤️ for the Boggle community
