import { useState } from 'react'
import { KanbanUser } from './KanbanBoard'

interface AddUserModalProps {
  onClose: () => void
  onAdd: (user: Omit<KanbanUser, 'id'>) => void
}

export default function AddUserModal({ onClose, onAdd }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cargo, setCargo] = useState('')
  const [avatar, setAvatar] = useState('')
  const [stepIndex, setStepIndex] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      name,
      email: email || null,
      phone: phone || null,
      cargo: cargo || null,
      avatar: avatar || null,
      stepIndex,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Usuário</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Preencha os dados do novo usuário</p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 transition-colors p-2 hover:bg-secondary-100 rounded-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-2">
                Nome *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-2">
                Telefone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label htmlFor="cargo" className="block text-sm font-medium text-secondary-700 mb-2">
                Cargo
              </label>
              <input
                id="cargo"
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
                placeholder="Ex: Gerente de Vendas"
              />
            </div>

            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-secondary-700 mb-2">
                Avatar URL
              </label>
              <input
                id="avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
                placeholder="https://exemplo.com/avatar.jpg"
              />
            </div>

            <div>
              <label htmlFor="stepIndex" className="block text-sm font-medium text-secondary-700 mb-2">
                Coluna Inicial
              </label>
              <select
                id="stepIndex"
                value={stepIndex}
                onChange={(e) => setStepIndex(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition-all bg-secondary-50"
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

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg shadow-primary-500/30"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
