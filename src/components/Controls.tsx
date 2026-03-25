export function Slider({
  label, value, min, max, step = 0.001, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctrl-value">{Number(value.toPrecision(3))}</span>
    </label>
  )
}

export function IntSlider({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="ctrl-row">
      <span className="ctrl-label">{label}</span>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctrl-value">{value}</span>
    </label>
  )
}

export function Toggle({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="ctrl-row ctrl-toggle">
      <span className="ctrl-label">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ctrl-section">
      <div className="ctrl-section-title">{title}</div>
      {children}
    </div>
  )
}
