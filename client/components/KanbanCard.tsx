import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface KanbanCardProps {
  user: any
  onSelect?: (user: any) => void
  isDragging?: boolean
}

export default function KanbanCard({ user, onSelect, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: user.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect && onSelect(user)}
      role="button"
      tabIndex={0}
      className={`bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transform hover:-translate-y-1 transition-all cursor-pointer border-l-4 border-primary-200 dark:border-primary-800 ${
        isDragging ? 'opacity-60 scale-95' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.customer_name || user.title || user.name}
              className="w-10 h-10 rounded-lg object-cover ring-1 ring-primary-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {getInitials(user.customer_name || user.title || user.name || 'CT')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{user.name}</h4>
            {user.role && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
            )}
            {user.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs text-secondary-600 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        {user.email && (
          <div className="flex items-center space-x-2">
            <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{user.email}</span>
          </div>
        )}

      </div>
    </div>
  )
}
