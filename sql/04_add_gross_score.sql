-- Migration: Add gross_score to daily_leaderboard
-- Run this if you already have an existing daily_leaderboard table

ALTER TABLE daily_leaderboard 
ADD COLUMN IF NOT EXISTS gross_score INTEGER;

-- Update existing rows where gross_score is null (set to net_score as a fallback)
UPDATE daily_leaderboard 
SET gross_score = net_score 
WHERE gross_score IS NULL;
