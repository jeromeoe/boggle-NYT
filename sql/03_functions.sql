-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_games INTEGER,
    avg_net_score NUMERIC,
    best_score INTEGER,
    total_words_found INTEGER,
    days_played INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_games,
        ROUND(AVG(net_score), 2) as avg_net_score,
        MAX(net_score)::INTEGER as best_score,
        SUM(ARRAY_LENGTH(words_found, 1))::INTEGER as total_words_found,
        COUNT(DISTINCT game_date)::INTEGER as days_played
    FROM game_stats
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily leaderboard
CREATE OR REPLACE FUNCTION update_daily_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_leaderboard (
        user_id,
        challenge_date,
        gross_score,
        net_score,
        words_found,
        completion_time_seconds
    )
    VALUES (
        NEW.user_id,
        NEW.game_date,
        NEW.gross_score,
        NEW.net_score,
        ARRAY_LENGTH(NEW.words_found, 1),
        NEW.duration_seconds
    )
    ON CONFLICT (user_id, challenge_date) 
    DO UPDATE SET
        gross_score = EXCLUDED.gross_score,
        net_score = EXCLUDED.net_score,
        words_found = EXCLUDED.words_found,
        completion_time_seconds = EXCLUDED.completion_time_seconds
    WHERE daily_leaderboard.net_score < EXCLUDED.net_score;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update leaderboard
CREATE TRIGGER update_leaderboard_on_game_complete
    AFTER INSERT ON game_stats
    FOR EACH ROW
    WHEN (NEW.is_daily_challenge = true)
    EXECUTE FUNCTION update_daily_leaderboard();

-- Function to rank leaderboard entries
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void AS $$
BEGIN
    UPDATE daily_leaderboard dl
    SET rank = ranked.rank
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY challenge_date 
                ORDER BY net_score DESC, completion_time_seconds ASC
            ) as rank
        FROM daily_leaderboard
    ) ranked
    WHERE dl.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
