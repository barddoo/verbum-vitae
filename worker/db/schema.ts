import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
    nextReview: text('next_review'),
    lastReview: text('last_review'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_progress_user_verse_translation_unique').on(table.userId, table.verseId, table.translation)],
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
