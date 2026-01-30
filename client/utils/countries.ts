export interface Country {
  code: string
  name: string
  flag: string
  dial: string
  format: string // regex pattern for phone validation
}

export const COUNTRIES: Record<string, Country> = {
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    dial: '+55',
    format: '^(\\d{2})(\\d{4,5})(\\d{4})$'
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    dial: '+1',
    format: '^(\\d{3})(\\d{3})(\\d{4})$'
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    dial: '+1',
    format: '^(\\d{3})(\\d{3})(\\d{4})$'
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    dial: '+52',
    format: '^(\\d{2})(\\d{4})(\\d{4})$'
  },
  ES: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    dial: '+34',
    format: '^(\\d{3})(\\d{3})(\\d{3})$'
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    dial: '+351',
    format: '^(\\d{3})(\\d{3})(\\d{3})$'
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    dial: '+44',
    format: '^(\\d{4})(\\d{3})(\\d{3})$'
  },
  DE: {
    code: 'DE',
    name: 'Deutschland',
    flag: '🇩🇪',
    dial: '+49',
    format: '^(\\d{3})(\\d{4})(\\d{4})$'
  },
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dial: '+33',
    format: '^(\\d{3})(\\d{3})(\\d{3})$'
  },
  IT: {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    dial: '+39',
    format: '^(\\d{3})(\\d{4})(\\d{4})$'
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    dial: '+54',
    format: '^(\\d{2})(\\d{4})(\\d{4})$'
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    dial: '+56',
    format: '^(\\d{1})(\\d{4})(\\d{4})$'
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    dial: '+57',
    format: '^(\\d{3})(\\d{3})(\\d{4})$'
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    dial: '+51',
    format: '^(\\d{3})(\\d{3})(\\d{3})$'
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    dial: '+61',
    format: '^(\\d{2})(\\d{4})(\\d{4})$'
  },
  JP: {
    code: 'JP',
    name: '日本',
    flag: '🇯🇵',
    dial: '+81',
    format: '^(\\d{3})(\\d{4})(\\d{4})$'
  },
  CN: {
    code: 'CN',
    name: '中国',
    flag: '🇨🇳',
    dial: '+86',
    format: '^(\\d{2})(\\d{4})(\\d{4})$'
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    dial: '+91',
    format: '^(\\d{4})(\\d{3})(\\d{3})$'
  },
}

export const COUNTRY_LIST = Object.values(COUNTRIES).sort((a, b) => {
  if (a.code === 'BR') return -1
  if (b.code === 'BR') return 1
  return a.name.localeCompare(b.name)
})

export function formatPhoneNumber(phoneNumber: string, country: Country): string {
  // Remove non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Format based on country
  if (country.code === 'BR') {
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
  } else if (country.code === 'US' || country.code === 'CA') {
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
  } else if (country.code === 'MX') {
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
  }
  
  return phoneNumber
}

export function extractPhoneDigits(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '')
}

export function savePhoneWithCountry(dialCode: string, phoneNumber: string): string {
  const digits = extractPhoneDigits(phoneNumber)
  return `${dialCode}${digits}`
}
