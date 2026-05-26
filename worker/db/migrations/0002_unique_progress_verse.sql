DELETE FROM progress
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, verse_id, translation
        ORDER BY updated_at DESC, id DESC
      ) AS rn
    FROM progress
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_verse_translation_unique
ON progress(user_id, verse_id, translation);
