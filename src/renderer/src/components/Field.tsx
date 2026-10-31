export default function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  error = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  error?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={error ? 'text' : type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={error ? 'The receipt could not be parsed' : undefined}
        aria-invalid={error || undefined}
        title={error ? 'The receipt could not be parsed. Enter the correct amount.' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={type === 'number' ? '0.001' : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
    </label>
  )
}
