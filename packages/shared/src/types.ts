import { z } from 'zod'

export const VerseSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  bookNumber: z.number().int().min(0),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(0),
  text: z.string(),
  translation: z.string(),
})

export const ProgressSchema = z.object({
  verseId: z.string(),
  translation: z.string(),
  cardJson: z.string(),
  updatedAt: z.iso.datetime(),
})

export const SyncLogEntry = z.object({
  id: z.string(),
  userId: z.string(),
  tableName: z.string(),
  rowId: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  data: z.string(),
  createdAt: z.iso.datetime(),
})

export const RegisterRequest = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const LoginRequest = z.object({
  email: z.email(),
  password: z.string(),
})

export const SyncPushRequest = z.object({
  entries: z.array(
    z.object({
      tableName: z.string(),
      rowId: z.string(),
      operation: z.enum(['create', 'update', 'delete']),
      data: z.string(),
    }),
  ),
})

export const SyncPullRequest = z.object({
  cursor: z.string().optional(),
})

export const CollectionSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  icon: z.string().default('📖'),
  color: z.string().nullable().default(null),
  isBuiltin: z.number().int().min(0).max(1).default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const CollectionVerseSchema = z.object({
  verseId: z.string(),
  translation: z.string(),
  sortOrder: z.number().int().default(0),
})

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int(),
  displayName: z.string(),
  memorizedCount: z.number().int(),
  totalRepetitions: z.number().int(),
  currentStreak: z.number().int(),
  isCurrentUser: z.boolean(),
})

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
  currentUserEntry: LeaderboardEntrySchema.nullable(),
  currentUserHidden: z.boolean(),
})

export const UpdateDisplayNameRequestSchema = z.object({
  displayName: z.string().min(1).max(40).trim(),
})

export const UpdateLeaderboardVisibilitySchema = z.object({
  hideFromLeaderboard: z.boolean(),
})

export type VerseRow = z.infer<typeof VerseSchema>
export type ProgressRow = z.infer<typeof ProgressSchema>
export type SyncLogRow = z.infer<typeof SyncLogEntry>
export type CollectionRow = z.infer<typeof CollectionSchema>
export type CollectionVerseRow = z.infer<typeof CollectionVerseSchema>
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>
