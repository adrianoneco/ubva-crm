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

import { getApiUrl } from '../config'

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
  { id: 2, title: 'Instalação' },
  { id: 3, title: 'Agendamento' },
  { id: 4, title: 'Treinamento 1' },
  { id: 5, title: 'Treinamento 2' },
  { id: 6, title: 'Enviar Pedido Teste' },
  { id: 7, title: 'Feedback' },
  { id: 8, title: 'Confirmação' },
]

export default function KanbanBoard({ onSelect }: { onSelect?: (user: KanbanUser) => void } = {}) {
  const [users, setUsers] = useState<KanbanUser[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const PALETTES = [
    { header: 'text-amber-800 dark:text-amber-300', badge: 'from-amber-100 to-amber-50 text-amber-700 dark:from-amber-900/20 dark:to-amber-800/20 dark:text-amber-300', colorClass: 'bg-amber-400 dark:bg-amber-700', borderClass: 'border-amber-400 dark:border-amber-700' },
    { header: 'text-emerald-800 dark:text-emerald-300', badge: 'from-emerald-100 to-emerald-50 text-emerald-700 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:text-emerald-300', colorClass: 'bg-emerald-400 dark:bg-emerald-700', borderClass: 'border-emerald-400 dark:border-emerald-700' },
    { header: 'text-teal-800 dark:text-teal-300', badge: 'from-teal-100 to-teal-50 text-teal-700 dark:from-teal-900/20 dark:to-teal-800/20 dark:text-teal-300', colorClass: 'bg-teal-400 dark:bg-teal-700', borderClass: 'border-teal-400 dark:border-teal-700' },
    { header: 'text-indigo-800 dark:text-indigo-300', badge: 'from-indigo-100 to-indigo-50 text-indigo-700 dark:from-indigo-900/20 dark:to-indigo-800/20 dark:text-indigo-300', colorClass: 'bg-indigo-400 dark:bg-indigo-700', borderClass: 'border-indigo-400 dark:border-indigo-700' },
    { header: 'text-purple-800 dark:text-purple-300', badge: 'from-purple-100 to-purple-50 text-purple-700 dark:from-purple-900/20 dark:to-purple-800/20 dark:text-purple-300', colorClass: 'bg-purple-400 dark:bg-purple-700', borderClass: 'border-purple-400 dark:border-purple-700' },
    { header: 'text-pink-800 dark:text-pink-300', badge: 'from-pink-100 to-pink-50 text-pink-700 dark:from-pink-900/20 dark:to-pink-800/20 dark:text-pink-300', colorClass: 'bg-pink-400 dark:bg-pink-700', borderClass: 'border-pink-400 dark:border-pink-700' },
    { header: 'text-rose-800 dark:text-rose-300', badge: 'from-rose-100 to-rose-50 text-rose-700 dark:from-rose-900/20 dark:to-rose-800/20 dark:text-rose-300', colorClass: 'bg-rose-400 dark:bg-rose-700', borderClass: 'border-rose-400 dark:border-rose-700' },
    { header: 'text-orange-800 dark:text-orange-300', badge: 'from-orange-100 to-orange-50 text-orange-700 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300', colorClass: 'bg-orange-400 dark:bg-orange-700', borderClass: 'border-orange-400 dark:border-orange-700' },
    { header: 'text-cyan-800 dark:text-cyan-300', badge: 'from-cyan-100 to-cyan-50 text-cyan-700 dark:from-cyan-900/20 dark:to-cyan-800/20 dark:text-cyan-300', colorClass: 'bg-cyan-400 dark:bg-cyan-700', borderClass: 'border-cyan-400 dark:border-cyan-700' },
  ]

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
      setLoading(true)
      setError(null)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/kanban`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()
      // Normalize kanban step property (support both snake_case from DB and camelCase from API)
      const normalized = Array.isArray(data) ? data.map((u: any) => ({ ...u, kanban_step: Number(u.kanban_step ?? u.kanbanStep ?? 0) })) : []
      setUsers(normalized)
    } catch (error) {
      console.error('Failed to fetch kanban users:', error)
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados')
      setUsers([])
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

    // Update locally immediately for better UX (normalize property)
    setUsers(users.map(u => u.id === userId ? { ...u, kanban_step: newStep } : u))

    // Update on server
    try {
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/kanban/${userId}`, {
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




  const activeUser = activeId ? users.find(u => u.id === activeId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Erro ao carregar dados</h3>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 h-[calc(100vh-5rem)] overflow-hidden">
      {/* header removed — tabs live on page header, board should fill remaining space */}

      {users.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum usuário adicionado</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Nenhum usuário disponível nesta coluna</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="relative">
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-inner">
          {/* Scroll arrows */}
          <button
            aria-label="Scroll left"
            onClick={() => {
              const c = scrollRef.current
              if (c) c.scrollBy({ left: -Math.round(c.clientWidth * 0.6), behavior: 'smooth' })
            }}
            className="hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2 shadow-md z-20 hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-6 px-4 scroll-smooth">
            {COLUMNS.map((column) => {
                const columnUsers = users.filter(u => u.kanban_step === column.id)
                const palette = PALETTES[column.id % PALETTES.length]
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
                      colorPalette={palette}
                      onSelect={onSelect}
                      borderClass={palette.borderClass}
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
            className="hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2 shadow-md z-20 hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

          <DragOverlay>
            {activeUser && (
              <div className="opacity-50">
                <KanbanCard user={activeUser} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}


    </div>
  )
}
