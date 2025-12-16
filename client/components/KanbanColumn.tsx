import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'
import { KanbanUser } from './KanbanBoard'

interface KanbanColumnProps {
  id: string
  title: string
  users: KanbanUser[]
  onDeleteUser: (id: number) => void
}

export default function KanbanColumn({ id, title, users, onDeleteUser }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 rounded-lg p-4 min-h-[400px] transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
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
