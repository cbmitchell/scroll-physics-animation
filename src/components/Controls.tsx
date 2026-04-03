export function Slider({
  label, value, min, max, step = 0.001, onChange, description, showInfo,
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
  description?: string; showInfo?: boolean
}) {
  return (
    <>
      <label className="ctrl-row">
        <span className="ctrl-label">{label}</span>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="ctrl-value">{Number(value.toPrecision(3))}</span>
      </label>
      {showInfo && description && <p className="ctrl-desc">{description}</p>}
    </>
  )
}


export function Toggle({
  label, value, onChange, description, showInfo,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void
  description?: string; showInfo?: boolean
}) {
  return (
    <>
      <label className="ctrl-row ctrl-toggle">
        <span className="ctrl-label">{label}</span>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      </label>
      {showInfo && description && <p className="ctrl-desc">{description}</p>}
    </>
  )
}

export function Section({ title, children }: { title: string; children: import('react').ReactNode }) {
  return (
    <div className="ctrl-section">
      <div className="ctrl-section-title">{title}</div>
      {children}
    </div>
  )
}
