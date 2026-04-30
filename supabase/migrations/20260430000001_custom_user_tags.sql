-- Add custom_tag column to users table
-- Allows admins to assign display tags (e.g. "Dev", "Mod", "Beta") to any user.

ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_tag text;
