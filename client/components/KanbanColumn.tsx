import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  id: string
  title: string
  users: any[]
  onDeleteUser: (id: string) => void
}

export default function KanbanColumn({ id, title, users, onDeleteUser }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex-none w-80 md:w-96 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] transition-all border-2 ${
        isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 shadow-lg shadow-primary-400/20' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{title}</h3>
        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium">
          {users.length}
        </span>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <KanbanCard
            key={user.id}
            user={user}
            onDelete={onDeleteUser}
          />
        ))}
      </div>
    </div>
  )
}
