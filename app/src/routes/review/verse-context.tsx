import { useEffect, useMemo, useState } from 'react'
import { fetchChapterWindow, parseTextKey } from '../../lib/db'

export function VerseContext({ verseId, translation, reference }: { verseId: string; translation: string; reference: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<{ number: number; text: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Only bible verses live inside a chapter; creeds and catechism items are self-contained.
  const parsed = parseTextKey(verseId)
  const isBible = parsed.sourceType === 'bible'
  const start = parsed.itemIndex ?? 1
  const end = parsed.itemEnd ?? start

  // Reset per verse so a grading advance never shows the previous verse's context.
  useEffect(() => {
    setOpen(false)
    setRows([])
    setLoading(false)
  }, [verseId, translation])

  useEffect(() => {
    if (!open || !isBible) return
    let cancelled = false
    setLoading(true)
    fetchChapterWindow(verseId, translation).then((window) => {
      if (!cancelled) {
        setRows(window)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, isBible, verseId, translation])

  const rowByNumber = useMemo(() => new Map(rows.map((r) => [r.number, r])), [rows])

  // Merge the fetched neighbours with a placeholder for the verse being memorized so the
  // paragraph reads as a continuous whole — the answer itself is never fetched into the DOM.
  const merged = useMemo(() => {
    const numbers = new Set([...rowByNumber.keys(), start, end])
    return [...numbers].sort((a, b) => a - b)
  }, [rowByNumber, start, end])

  const isTarget = (n: number) => n >= start && n <= end

  if (!isBible) return null

  return (
    <div className="review-context">
      {!open ? (
        <button type="button" className="btn btn-secondary btn-sm review-context-toggle" onClick={() => setOpen(true)}>
          Ver contexto
        </button>
      ) : (
        <>
          <div className="review-context-head">
            <span className="review-context-title">Contexto · {reference}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
              Ocultar
            </button>
          </div>
          {loading ? (
            <p className="review-context-loading">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="review-context-loading">Sem outros versículos neste capítulo.</p>
          ) : (
            <div className="review-context-body">
              {merged.map((n) => {
                if (isTarget(n)) {
                  return (
                    <p key={n} className="review-context-verse review-context-hidden" aria-hidden="true">
                      <sup className="review-context-num">{start === end ? n : `${start}–${end}`}</sup>
                      <span className="review-context-mask">··········</span>
                    </p>
                  )
                }
                const row = rowByNumber.get(n)
                if (!row) return null
                return (
                  <p key={n} className="review-context-verse">
                    <sup className="review-context-num">{n}</sup> {row.text}
                  </p>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
