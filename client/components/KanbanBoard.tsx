import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import AddUserModal from './AddUserModal'

export interface KanbanUser {
  id: string
  phone?: string
  step?: number
  name?: string
  email?: string
  role?: string
  last_message_id?: string
  created_at?: string
  kanban_step?: number
  avatar?: string | null
}

const COLUMNS = [
  { id: 0, title: 'Início' },
  { id: 1, title: 'Cadastro' },
  { id: 2, title: 'Agendamento' },
  { id: 3, title: 'Instalação' },
  { id: 4, title: 'Treinamento 1' },
  { id: 5, title: 'Treinamento 2' },
  { id: 6, title: 'Enviar Pedido Teste' },
  { id: 7, title: 'Feedback' },
  { id: 8, title: 'Confirmação' },
]

export default function KanbanBoard() {
  const [users, setUsers] = useState<KanbanUser[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/kanban')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch kanban users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const userId = active.id as string
    const newStep = parseInt(over.id as string)

    if (isNaN(newStep)) {
      setActiveId(null)
      return
    }

    // Update locally immediately for better UX
    setUsers(users.map(u => u.id === userId ? { ...u, kanban_step: newStep } : u))

    // Update on server
    try {
      await fetch(`http://localhost:3001/api/kanban/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStep: newStep }),
      })
    } catch (error) {
      console.error('Failed to update kanban user:', error)
      fetchUsers()
    }

    setActiveId(null)
  }

  const handleAddUser = async (userData: any) => {
    // keep existing kanban user creation (optional) — this doesn't create appointments
    try {
      const response = await fetch('http://localhost:3001/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const newUser = await response.json()
      // optional: map to appointment if desired
      setUsers([...users, newUser])
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/kanban/${id}`, {
        method: 'DELETE',
      })
      setUsers(users.filter(user => user.id !== id))
    } catch (error) {
      console.error('Failed to delete kanban user:', error)
    }
  }

  const activeUser = activeId ? users.find(u => u.id === activeId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-400 rounded-full animate-spin"></div>
          <span className="text-secondary-500">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Gerencie o progresso dos seus contatos</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg shadow-primary-500/30 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Usuário
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative">
          {/* Scroll arrows */}
          <button
            aria-label="Scroll left"
            onClick={() => {
              const c = scrollRef.current
              if (c) c.scrollBy({ left: -Math.round(c.clientWidth * 0.6), behavior: 'smooth' })
            }}
            className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full p-2 shadow-md z-20 ml-2 hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth">
            {COLUMNS.map(column => {
              const columnUsers = users.filter(u => u.kanban_step === column.id)
              return (
                <SortableContext
                  key={column.id}
                  items={columnUsers.map(u => u.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <KanbanColumn
                    id={column.id.toString()}
                    title={column.title}
                    users={columnUsers}
                    onDeleteUser={handleDeleteUser}
                  />
                </SortableContext>
              )
            })}
          </div>

          <button
            aria-label="Scroll right"
            onClick={() => {
              const c = scrollRef.current
              if (c) c.scrollBy({ left: Math.round(c.clientWidth * 0.6), behavior: 'smooth' })
            }}
            className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full p-2 shadow-md z-20 mr-2 hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <DragOverlay>
          {activeUser && (
            <div className="opacity-50">
              <KanbanCard user={activeUser} onDelete={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
        />
      )}
    </div>
  )
}
