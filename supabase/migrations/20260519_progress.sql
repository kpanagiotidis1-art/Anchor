-- Run this in your Supabase SQL editor.
-- Creates weight_logs and progress_photos tables with RLS.
-- Also requires a private Storage bucket named "progress-photos".

-- ── Weight logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE NOT NULL,
  weight_kg   DECIMAL(5,2) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, log_date)
);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own weight logs"
  ON weight_logs FOR ALL
  USING (auth.uid() = user_id);

-- ── Progress photos ───────────────────────────────────────────────────────────
-- Photo files live in Supabase Storage bucket "progress-photos".
-- This table stores metadata + the storage path for signed URL retrieval.

CREATE TABLE IF NOT EXISTS progress_photos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_date    DATE NOT NULL,
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own progress photos"
  ON progress_photos FOR ALL
  USING (auth.uid() = user_id);

-- Storage bucket policy (run separately in Storage > Policies after creating
-- the "progress-photos" bucket as Private):
--
-- CREATE POLICY "Users access their own photos"
--   ON storage.objects FOR ALL
--   USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
