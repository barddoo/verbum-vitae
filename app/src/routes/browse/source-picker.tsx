import { AVAILABLE_SOURCES, type SourceOption } from '../../lib/text-sources'

export function SourcePicker({ current, onChange }: { current: SourceOption; onChange: (s: SourceOption) => void }) {
  return (
    <div className="source-picker">
      <div className="source-picker-options">
        {AVAILABLE_SOURCES.map((s) => (
          <button
            type="button"
            key={`${s.type}:${s.id}`}
            className={`source-chip ${current.type === s.type && current.id === s.id ? 'active' : ''}`}
            onClick={() => onChange(s)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
