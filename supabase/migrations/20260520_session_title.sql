-- Add custom title field to workout_sessions.
-- Run in your Supabase SQL editor.

ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS title TEXT;
