import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  currentStreak: integer('current_streak').notNull().default(0),
  hideFromLeaderboard: integer('hide_from_leaderboard', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const progress = sqliteTable(
  'progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    verseId: text('verse_id').notNull(),
    translation: text('translation').notNull(),
    cardJson: text('card_json').notNull(),
    ease: real('ease').default(2.5),
    intervalDays: integer('interval_days').default(0),
    repetitions: integer('repetitions').default(0),
    /** FSRS card state: 0 New, 1 Learning, 2 Review, 3 Relearning. */
    state: integer('state').notNull().default(0),
    nextReview: text('next_review'),
    /** Null until the verse is actually reviewed — adding a verse does not set it. */
    lastReview: text('last_review'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_progress_user_verse_translation_unique').on(table.userId, table.verseId, table.translation)],
)

/**
 * Append-only history of every grade press. `progress` keeps only the latest review per verse,
 * so it cannot answer "how many reviews on day X" or feed an FSRS parameter optimizer.
 */
export const reviewLog = sqliteTable(
  'review_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    verseId: text('verse_id').notNull(),
    translation: text('translation').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
    /** FSRS grade 1-4. `0` marks a row backfilled from `progress.last_review` — day known, grade not. */
    rating: integer('rating').notNull(),
    /** Card state *before* this review: 0 New, 1 Learning, 2 Review, 3 Relearning. */
    state: integer('state').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    // Reviews are immutable, so a replayed push must land as a no-op rather than a duplicate day.
    uniqueIndex('idx_review_log_user_verse_translation_time_unique').on(table.userId, table.verseId, table.translation, table.reviewedAt),
    index('idx_review_log_user_reviewed_at').on(table.userId, table.reviewedAt),
  ],
)

export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').default(''),
    icon: text('icon').default('📖'),
    color: text('color'),
    isBuiltin: integer('is_builtin').default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_collections_user_slug_unique').on(table.userId, table.slug)],
)

export const collectionVerses = sqliteTable(
  'collection_verses',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    verseId: text('verse_id').notNull(),
    translation: text('translation').notNull(),
    sortOrder: integer('sort_order').default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_cv_collection_verse_translation_unique').on(table.collectionId, table.verseId, table.translation)],
)

export const syncLog = sqliteTable('sync_log', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tableName: text('table_name').notNull(),
  rowId: text('row_id').notNull(),
  operation: text('operation').notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
})
