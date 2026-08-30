ALTER TABLE progress ADD COLUMN state INTEGER NOT NULL DEFAULT 0;

-- Backfill from the FSRS card already stored on every row (0 New, 1 Learning, 2 Review, 3 Relearning).
UPDATE progress SET state = COALESCE(CAST(json_extract(card_json, '$.state') AS INTEGER), 0);

CREATE INDEX IF NOT EXISTS idx_progress_user_state ON progress (user_id, state);
