-- Append-only review history. `progress` holds only the latest review per verse, so day counts
-- and streaks derived from `last_review` shrank as verses came up again, and FSRS parameter
-- optimization was impossible without a full log.
CREATE TABLE IF NOT EXISTS review_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  verse_id TEXT NOT NULL,
  translation TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  -- FSRS grade 1-4. 0 marks a row backfilled below: the day is real, the grade was never recorded.
  rating INTEGER NOT NULL,
  -- Card state *before* the review: 0 New, 1 Learning, 2 Review, 3 Relearning.
  state INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Reviews are immutable, so a replayed push lands as a no-op instead of a duplicate day.
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_log_user_verse_translation_time_unique
  ON review_log (user_id, verse_id, translation, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_review_log_user_reviewed_at ON review_log (user_id, reviewed_at);

-- Seed the one review per verse that `progress` still remembers, so existing users keep their
-- streak. `state > 0` skips cards that were added but never reviewed.
INSERT OR IGNORE INTO review_log (id, user_id, verse_id, translation, reviewed_at, rating, state, scheduled_days, created_at)
SELECT
  lower(hex(randomblob(16))),
  user_id,
  verse_id,
  translation,
  last_review,
  0,
  state,
  0,
  last_review
FROM progress
WHERE last_review IS NOT NULL AND state > 0;
