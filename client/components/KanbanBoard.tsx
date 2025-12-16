import { useState, useEffect } from 'react'
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
  id: number
  name: string
  avatar: string | null
  phone: string | null
  email: string | null
  cargo: string | null
  stepIndex: number
}

const COLUMNS = [
  { id: 0, title: 'Início' },
  { id: 1, title: 'Cadastro' },
  { id: 2, title: 'Agendamento' },
  { id: 3, title: 'Treinamento 1' },
  { id: 4, title: 'Treinamento 2' },
  { id: 5, title: 'Enviar Pedido Teste' },
  { id: 6, title: 'Feedback' },
  { id: 7, title: 'Confirmação' },
]

export default function KanbanBoard() {
  const [users, setUsers] = useState<KanbanUser[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/kanban')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const userId = active.id as number
    const newStepIndex = parseInt(over.id as string)

    if (isNaN(newStepIndex)) {
      setActiveId(null)
      return
    }

    // Update locally immediately for better UX
    setUsers(users.map(user => 
      user.id === userId ? { ...user, stepIndex: newStepIndex } : user
    ))

    // Update on server
    try {
      await fetch(`http://localhost:3001/api/kanban/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex: newStepIndex }),
      })
    } catch (error) {
      console.error('Failed to update user:', error)
      // Revert on error
      fetchUsers()
    }

    setActiveId(null)
  }

  const handleAddUser = async (userData: Omit<KanbanUser, 'id'>) => {
    try {
      const response = await fetch('http://localhost:3001/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const newUser = await response.json()
      setUsers([...users, newUser])
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }

  const handleDeleteUser = async (id: number) => {
    try {
      await fetch(`http://localhost:3001/api/kanban/${id}`, {
        method: 'DELETE',
      })
      setUsers(users.filter(user => user.id !== id))
    } catch (error) {
      console.error('Failed to delete user:', error)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => {
            const columnUsers = users.filter(u => u.stepIndex === column.id)
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
