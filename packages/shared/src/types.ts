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
  createdAt: z.string().datetime(),
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

export type VerseRow = z.infer<typeof VerseSchema>
export type ProgressRow = z.infer<typeof ProgressSchema>
export type SyncLogRow = z.infer<typeof SyncLogEntry>
