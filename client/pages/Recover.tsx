import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../config'
import AuthLayout from '../components/AuthLayout'

type RecoverStep = 'method-choice' | 'request' | 'verify-otp' | 'reset-password'

export default function Recover() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<RecoverStep>('method-choice')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [recoveryMethod, setRecoveryMethod] = useState<'whatsapp' | 'email'>('whatsapp')
  const navigate = useNavigate()

  // Load auth config on mount to check if email is enabled
  useEffect(() => {
    const loadAuthConfig = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/api/auth/config`)
        const config = await response.json()
        setEmailEnabled(config.emailVerificationEnabled)
        
        // If only email is available, skip method choice
        if (config.emailVerificationEnabled && !process.env.ZAPI_INSTANCE_ID) {
          setRecoveryMethod('email')
          setStep('request')
        } else if (!config.emailVerificationEnabled) {
          // If only WhatsApp is available, skip method choice
          setRecoveryMethod('whatsapp')
          setStep('request')
        }
      } catch (err) {
        console.error('Failed to load auth config:', err)
        // Default to method choice if error
        setStep('method-choice')
      }
    }
    loadAuthConfig()
  }, [])

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to request recovery')
        return
      }

      setSuccess('Código OTP enviado via WhatsApp!')
      setOtpExpiry(data.expiresIn || 300) // 5 minutes default
      setOtpAttempts(0)
      setTimeout(() => setStep('verify-otp'), 1500)
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!otp || otp.length !== 6) {
      setError('Código deve ter 6 dígitos')
      setLoading(false)
      return
    }

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        setOtpAttempts(prev => prev + 1)
        if (otpAttempts >= 2) {
          setError('Muitas tentativas. Solicite um novo código.')
          setStep('request')
          setOtp('')
        } else {
          setError(data.error || 'Código inválido')
        }
        return
      }

      setSuccess('Código verificado! Prosseguindo para redefinição de senha...')
      setTimeout(() => setStep('reset-password'), 1500)
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('As senhas não correspondem')
      return
    }

    if (newPassword.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/auth/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Falha ao redefinir senha')
        return
      }

      setSuccess('Senha redefinida com sucesso! Redirecionando para login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'method-choice' && 'Recuperar Senha'}
            {step === 'request' && 'Recuperar Senha'}
            {step === 'verify-otp' && 'Verificar Código'}
            {step === 'reset-password' && 'Redefinir Senha'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {step === 'method-choice' && 'Escolha como deseja recuperar sua senha'}
            {step === 'request' && (recoveryMethod === 'whatsapp' ? 'Digite seu email e telefone para receber um código OTP' : 'Digite seu email para recuperar sua senha')}
            {step === 'verify-otp' && 'Verifique o código enviado via WhatsApp'}
            {step === 'reset-password' && 'Digite sua nova senha'}
          </p>
        </div>

        {/* Step Indicator - Hide for method choice */}
        {step !== 'method-choice' && (
          <div className="flex gap-2 mb-8">
            {(['request', 'verify-otp', 'reset-password'] as const).map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${
                  step === s
                    ? 'bg-blue-500'
                    : ['request', 'verify-otp', 'reset-password'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Step 0: Choose recovery method */}
        {step === 'method-choice' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setRecoveryMethod('whatsapp')
                setEmail('')
                setPhone('')
                setOtp('')
                setError('')
                setSuccess('')
                setStep('request')
              }}
              className="w-full p-4 border-2 border-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-all">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp (OTP)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receba um código via WhatsApp</p>
                </div>
              </div>
            </button>

            {emailEnabled && (
              <button
                onClick={() => {
                  setRecoveryMethod('email')
                  setEmail('')
                  setPhone('')
                  setOtp('')
                  setError('')
                  setSuccess('')
                  setStep('request')
                }}
                className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-all">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receba um link de recuperação por email</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WhatsApp (com DDI)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="554499999999"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inclua o código do país (55 para Brasil)</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </span>
              ) : 'Enviar Código OTP'}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 'verify-otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Código OTP (6 dígitos)
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                required
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 dark:text-white font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Expira em: <span className="font-semibold">{Math.ceil(otpExpiry / 60)}m {otpExpiry % 60}s</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('request')
                  setOtp('')
                  setError('')
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nova Senha
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redefinindo...
                </span>
              ) : 'Redefinir Senha'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center space-y-2">
          {step !== 'method-choice' && (
            <button
              onClick={() => setStep('method-choice')}
              className="w-full text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm font-medium transition-colors flex items-center gap-2 justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao método anterior
            </button>
          )}
          <button
            onClick={() => navigate('/login')}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao login
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
