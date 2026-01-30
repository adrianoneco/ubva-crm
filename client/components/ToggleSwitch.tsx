interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  enabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md'
}: ToggleSwitchProps) {
  const sizeMap = {
    sm: { outer: 'w-11 h-6', inner: 'w-5 h-5', translate: 'translate-x-5' },
    md: { outer: 'w-14 h-8', inner: 'w-6 h-6', translate: 'translate-x-6' },
    lg: { outer: 'w-16 h-9', inner: 'w-7 h-7', translate: 'translate-x-8' }
  }

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`
          ${sizeMap[size].outer} rounded-full transition-all duration-300 flex items-center
          ${checked 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
            : 'bg-gray-300 dark:bg-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          <div className={`
            ${sizeMap[size].inner} bg-white rounded-full shadow-md 
            transform transition-transform duration-300 absolute top-1/2 -translate-y-1/2 left-1
            ${checked ? sizeMap[size].translate : 'translate-x-0'}
          `}></div>
        </div>
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>}
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      )}
    </label>
  )
}
