import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import MainLayout from '../components/MainLayout'
import MeetingScheduler from '../components/MeetingScheduler'

interface KanbanUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: string | null
  avatar: string | null
  kanbanStep: number
  createdAt: string
  agendamentoId?: string | null
  appointmentDateTime?: string | null
}

const KANBAN_STEPS = [
  { id: 0, name: 'Inicio', color: 'bg-gray-500' },
  { id: 1, name: 'Cadastro', color: 'bg-blue-500' },
  { id: 2, name: 'Agendamento', color: 'bg-indigo-500' },
  { id: 3, name: 'Instalação', color: 'bg-purple-500' },
  { id: 4, name: 'Treinamento', color: 'bg-yellow-500' },
  { id: 5, name: 'Fazer Teste', color: 'bg-orange-500' },
  { id: 6, name: 'Feedback', color: 'bg-pink-500' },
  { id: 7, name: 'Confirmação', color: 'bg-green-500' },
]

export default function WebGlass() {
  const [activeTab, setActiveTab] = useState<'evolucao' | 'agendamentos'>('evolucao')
  const [users, setUsers] = useState<KanbanUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<KanbanUser | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    kanbanStep: 0,
  })

  // Fetch users function
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/kanban')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()

    // Atualizar do banco de dados a cada 3 segundos
    const intervalId = setInterval(() => {
      console.log('[WebGlass] 🔄 Buscando dados do DB...')
      fetchUsers()
    }, 3000)

    // Socket.io connection - connect to same origin to use Vite proxy
    const socketUrl = `${window.location.protocol}//${window.location.host}`
    const newSocket = io(socketUrl, { 
      path: '/socket.io',
      transports: ['polling', 'websocket']
    })
    
    newSocket.on('connect', () => {
      console.log('[WebGlass] ✅ Socket connected:', newSocket.id)
    })

    newSocket.on('kanban-update', () => {
      console.log('[WebGlass] 🔄 Kanban update received from server')
      fetchUsers()
    })

    return () => {
      clearInterval(intervalId)
      newSocket.disconnect()
    }
  }, [])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchUsers()
        setShowAddModal(false)
        setFormData({ name: '', phone: '', email: '', role: '', kanbanStep: 0 })
      }
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    try {
      const response = await fetch(`/api/kanban/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchUsers()
        setEditingUser(null)
        setFormData({ name: '', phone: '', email: '', role: '', kanbanStep: 0 })
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      const response = await fetch(`/api/kanban/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  async function moveUser(userId: string, newStep: number) {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const response = await fetch(`/api/kanban/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, kanbanStep: newStep }),
      })

      if (response.ok) {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Failed to move user:', error)
    }
  }



  function openEditModal(user: KanbanUser) {
    setEditingUser(user)
    setFormData({
      name: user.name,
      phone: user.phone,
      email: user.email || '',
      role: user.role || '',
      kanbanStep: user.kanbanStep,
    })
  }

  function getUsersByStep(step: number) {
    return users.filter(u => u.kanbanStep === step)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WebGlass</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie o fluxo de clientes e agendamentos
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('evolucao')}
              className={`pb-4 px-2 font-medium text-sm transition-all relative ${
                activeTab === 'evolucao'
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Evolução (Kanban)
              {activeTab === 'evolucao' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('agendamentos')}
              className={`pb-4 px-2 font-medium text-sm transition-all relative ${
                activeTab === 'agendamentos'
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Agendamentos
              {activeTab === 'agendamentos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'evolucao' ? (
          <>
            {/* Kanban Board with Horizontal Scroll */}
            <div className="relative" style={{ height: 'calc(100vh - 280px)' }}>
              <div 
                className="flex gap-4 h-full overflow-x-auto overflow-y-hidden" 
                style={{ 
                  maxHeight: 'calc(100vh - 280px)',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingBottom: '16px'
                }}
              >
              {KANBAN_STEPS.map(step => (
                <div
                  key={step.id}
                  className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col w-80 flex-shrink-0"
                  style={{ 
                    height: 'calc(100% - 16px)'
                  }}
                >
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${step.color}`}></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{step.name}</h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                  {getUsersByStep(step.id).length}
                </span>
              </div>

                  <div className="space-y-3 overflow-y-auto flex-1 scrollbar-hide">
                {getUsersByStep(step.id).map(user => (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('userId', user.id)
                      e.dataTransfer.setData('currentStep', String(user.kanbanStep))
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedUserId = e.dataTransfer.getData('userId')
                      if (draggedUserId !== user.id) {
                        moveUser(draggedUserId, step.id)
                      }
                    }}
                  >
                    {user.agendamentoId && user.appointmentDateTime && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg" title={`Agendamento: ${new Date(user.appointmentDateTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.phone}
                          </p>
                          {user.email && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {user.email}
                            </p>
                          )}
                          {user.role && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              {user.role}
                            </span>
                          )}
                          {user.agendamentoId && user.appointmentDateTime && (() => {
                            const dateTimeStr = typeof user.appointmentDateTime === 'string' ? user.appointmentDateTime : new Date(user.appointmentDateTime).toISOString()
                            const [datepart, timepart] = dateTimeStr.split('T')
                            const [, month, day] = datepart.split('-')
                            const time = timepart.split(':').slice(0, 2).join(':')
                            return (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium">{day}/{month}</span>
                                  <span className="mx-1">•</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium">{time}</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Move buttons */}
                    {(step.id > 0 || step.id < KANBAN_STEPS.length - 1) && (
                      <div className="flex mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 gap-2">
                        {step.id > 0 && (
                          <button
                            onClick={() => moveUser(user.id, step.id - 1)}
                            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded text-gray-700 dark:text-gray-200"
                          >
                            ← Anterior
                          </button>
                        )}

                        {step.id < KANBAN_STEPS.length - 1 && (
                          <button
                            onClick={() => moveUser(user.id, step.id + 1)}
                            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded text-gray-700 dark:text-gray-200"
                          >
                            Próximo →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Drop zone - always visible */}
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-gray-400 dark:text-gray-500 min-h-[100px] flex items-center justify-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const userId = e.dataTransfer.getData('userId')
                    moveUser(userId, step.id)
                  }}
                >
                  Arraste um cliente aqui
                </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <MeetingScheduler />
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingUser ? 'Editar Cliente' : 'Adicionar Cliente'}
            </h2>

            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Etapa do Kanban
                </label>
                <select
                  value={formData.kanbanStep}
                  onChange={(e) => setFormData({ ...formData, kanbanStep: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {KANBAN_STEPS.map(step => (
                    <option key={step.id} value={step.id}>
                      {step.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingUser(null)
                    setFormData({ name: '', phone: '', email: '', role: '', kanbanStep: 0 })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                >
                  {editingUser ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
