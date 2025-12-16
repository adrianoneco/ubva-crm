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
      className={`flex-none w-72 md:w-80 bg-gray-100 dark:bg-gray-800 rounded-xl p-5 min-h-[400px] transition-all border-4 ${
        isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-lg shadow-primary-400/20' : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{title}</h3>
        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium">
          {users.length}
        </span>
      </div>

      <div className="space-y-4">
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
