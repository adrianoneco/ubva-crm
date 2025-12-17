import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  id: string
  title: string
  users: any[]
  colorPalette?: { header: string; badge: string; colorClass?: string }
  borderClass?: string
  onSelect?: (user: any) => void
}

export default function KanbanColumn({ id, title, users, colorPalette, borderClass, onSelect }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const headerClass = colorPalette ? colorPalette.header : 'text-gray-800 dark:text-gray-100'
  const badgeClass = colorPalette ? colorPalette.badge : 'from-primary-100 to-primary-50 text-primary-700 dark:from-primary-900/20 dark:to-primary-800/20 dark:text-primary-300'

  return (
    <div
      ref={setNodeRef}
      className={`flex-none w-64 md:w-72 bg-white dark:bg-gray-800 rounded-2xl p-4 min-h-[340px] max-h-[calc(100vh-8rem)] overflow-y-auto transition-all border ${
        isOver ? 'shadow-lg border-opacity-60 ring-1 ring-primary-200/40' : 'border-gray-200 dark:border-gray-700 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-sm ${headerClass}`}>{title}</h3>
        <span className={`bg-gradient-to-r ${badgeClass} text-xs px-3 py-1 rounded-full font-medium shadow-inner`}>
          {users.length}
        </span>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <KanbanCard
            key={user.id}
            user={user}
            onSelect={onSelect}
            indicatorClass={borderClass}
          />
        ))}
      </div>
    </div>
  )
}
