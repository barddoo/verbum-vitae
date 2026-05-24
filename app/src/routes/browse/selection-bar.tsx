export function SelectionBar({
  count,
  previewText,
  onClear,
  onMemorize,
}: {
  count: number
  previewText: string
  onClear: () => void
  onMemorize: () => void
}) {
  if (count === 0) return null

  return (
    <div className="selection-bar">
      <div className="selection-bar-info">
        <span className="selection-bar-count">
          {count} selecionado{count > 1 ? 's' : ''}
        </span>
        <span className="selection-bar-preview">
          "{previewText.slice(0, 60)}
          {previewText.length > 60 ? '…' : ''}"
        </span>
      </div>
      <div className="selection-bar-actions">
        <button type="button" className="btn btn-sm btn-secondary" onClick={onClear}>
          Limpar
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={onMemorize}>
          Memorizar
        </button>
      </div>
    </div>
  )
}
