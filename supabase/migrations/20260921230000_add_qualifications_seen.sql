-- Tracks which rank-achievement popups a user has already dismissed, so the
-- congrats/confetti modal shows exactly once per rank (server-side, so the
-- dismissal is remembered across devices — not localStorage).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualifications_seen TEXT[] NOT NULL DEFAULT '{}';
