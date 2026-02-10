# Leaderboard Score Display Update Summary

## ✅ Changes Made

The leaderboard now shows **both** scores for each player:
- **Net Score** (large, bold) - Actual score after penalties
- **Raw Score** (small, light gray) - Score before penalties

### Example Display:
```
🏆 1. PlayerName
   1200  ← Net score (main, bold)
930 raw ← Gross score (lighter, smaller)
```

## Files Modified

### 1. **Database Schema**
- `sql/01_users_schema.sql` - Added `gross_score` column to `daily_leaderboard` table
- `sql/03_functions.sql` - Updated trigger to insert/update `gross_score` 
- `sql/04_add_gross_score.sql` - NEW migration script for existing databases

### 2. **TypeScript Types**
- `src/lib/supabase/client.ts` - Added `gross_score` to `LeaderboardEntry` interface

### 3. **UI Component**
- `src/components/game/Leaderboard.tsx` - Updated score display format

### 4. **Build Script**
- `scripts/daily-preview.ts` - Fixed import issue (unrelated but needed for build)

## Deployment Checklist

Before deploying, you need to update your Supabase database:

### If Fresh Database:
Run all SQL files in order:
```sql
sql/00_drop_policies.sql
sql/01_users_schema.sql
sql/02_rls_policies.sql
sql/03_functions.sql
```

### If Existing Database:
Run the migration script first:
```sql
sql/04_add_gross_score.sql  -- Adds the column
sql/03_functions.sql        -- Updates the trigger function
```

## Next Steps
1. ✅ Build passes locally
2. ⏭️ Run SQL migration in Supabase (if you have existing data)
3. ⏭️ Commit and push changes
4. ⏭️ Deploy to production

## Visual Result
Players can now see:
- How well they scored (net score)
- How many points they lost to penalties (difference between raw and net)
