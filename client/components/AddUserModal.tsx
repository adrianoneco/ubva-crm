import { useState } from 'react'
import PhoneInput from './PhoneInput'
import { COUNTRIES } from '../utils/countries'
import { API_URL } from '../config'

interface KanbanUser {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  avatar?: string
  kanban_step: number
  country?: string
  whatsappProfileFetch?: boolean
}

interface AddUserModalProps {
  onClose: () => void
  onAdd: (user: Omit<KanbanUser, 'id'>) => void
}

export default function AddUserModal({ onClose, onAdd }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('BR')
  const [role, setRole] = useState('')
  const [avatar, setAvatar] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [fetchWhatsAppProfile, setFetchWhatsAppProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Extract phone digits and format with country dial code
    const dialCode = COUNTRIES[country]?.dial || '+55'
    const phoneDigits = phone.replace(/\D/g, '')
    const fullPhone = `${dialCode}${phoneDigits}`

    let profileAvatar = avatar
    
    // Fetch WhatsApp profile picture if checkbox is enabled
    if (fetchWhatsAppProfile && phoneDigits) {
      setLoadingProfile(true)
      try {
        const response = await fetch(`${API_URL}/api/contacts/whatsapp-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fullPhone })
        })
        
        if (response.ok) {
          const data = await response.json()
          profileAvatar = data.profile_picture_url || avatar
        }
      } catch (error) {
        console.error('Failed to fetch WhatsApp profile:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    onAdd({
      name,
      email: email || undefined,
      phone: fullPhone,
      role: role || undefined,
      avatar: profileAvatar || undefined,
      kanban_step: stepIndex,
      country: country,
      whatsappProfileFetch: fetchWhatsAppProfile
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar Usuário</h2>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Preencha os dados do novo usuário</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cargo / Role
                </label>
                <input
                  id="role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Gerente"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                defaultCountry={country}
                onCountryChange={setCountry}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <input
                id="whatsapp"
                type="checkbox"
                checked={fetchWhatsAppProfile}
                onChange={(e) => setFetchWhatsAppProfile(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded cursor-pointer"
              />
              <label htmlFor="whatsapp" className="flex-1 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span>Buscar foto de perfil do WhatsApp</span>
                  {loadingProfile && <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Será usado automaticamente na criação do contato</p>
              </label>
            </div>

            <div>
              <label htmlFor="stepIndex" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Coluna Inicial
              </label>
              <select
                id="stepIndex"
                value={stepIndex}
                onChange={(e) => setStepIndex(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
              >
                <option value={0}>Início</option>
                <option value={1}>Cadastro</option>
                <option value={2}>Agendamento</option>
                <option value={3}>Treinamento 1</option>
                <option value={4}>Treinamento 2</option>
                <option value={5}>Enviar Pedido Teste</option>
                <option value={6}>Feedback</option>
                <option value={7}>Confirmação</option>
              </select>
            </div>

            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avatar URL (opcional)
              </label>
              <input
                id="avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                placeholder="https://exemplo.com/avatar.jpg"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingProfile}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingProfile ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Carregando...
                  </>
                ) : (
                  'Adicionar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
