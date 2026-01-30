import { useState } from 'react'
import { COUNTRIES, COUNTRY_LIST, formatPhoneNumber, extractPhoneDigits } from '../utils/countries'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onCountryChange?: (countryCode: string) => void
  defaultCountry?: string
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '(00) 0000-0000',
  onCountryChange,
  defaultCountry = 'BR'
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry)

  const country = COUNTRIES[selectedCountry]

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value
    const digits = extractPhoneDigits(input)
    
    // Limita ao tamanho máximo baseado no país
    let maxLength = 11 // Brasil padrão
    if (selectedCountry === 'US' || selectedCountry === 'CA') maxLength = 10
    else if (selectedCountry === 'MX') maxLength = 10
    
    if (digits.length <= maxLength) {
      const formatted = formatPhoneNumber(digits, country)
      onChange(formatted)
    }
  }

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode)
    onCountryChange?.(countryCode)
    setIsOpen(false)
    // Clear phone when changing country
    onChange('')
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Country Selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
          >
            <span className="text-lg">{country?.flag}</span>
            <span className="text-sm font-medium hidden sm:inline">{country?.code}</span>
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto min-w-max">
              {COUNTRY_LIST.map((c) => (
                <button
                  key={c.code}
                  onClick={() => handleCountrySelect(c.code)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                    selectedCountry === c.code
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs opacity-75">{c.dial}</div>
                  </div>
                  {selectedCountry === c.code && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Input */}
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium pointer-events-none">
            {country?.dial}
          </div>
          <input
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className="w-full pl-12 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>
    </div>
  )
}
