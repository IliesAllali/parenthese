import './SizeOptions.css'

export default function SizeOptions({ value, min, max, label, onChange }) {
  return (
    <div className="size-options">
      <div className="size-options__header">
        <span className="size-options__label">{label}</span>
        <span className="size-options__value">{value}</span>
      </div>
      <input
        className="size-options__slider"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
