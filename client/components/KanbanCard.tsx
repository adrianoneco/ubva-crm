import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface KanbanCardProps {
  user: any
  onDelete: (id: string) => void
  isDragging?: boolean
}

export default function KanbanCard({ user, onDelete, isDragging = false }: KanbanCardProps) {
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
      className={`bg-white dark:bg-gray-700 rounded-xl p-3 shadow-sm hover:shadow-lg transition-all cursor-move border border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.customer_name || user.title || user.name}
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-primary-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs shadow-lg shadow-primary-400/30">
              {getInitials(user.customer_name || user.title || user.name || 'CT')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white text-xs truncate">{user.name}</h4>
            {user.role && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
            )}
            {user.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.phone}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(user.id)
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-1 text-xs text-secondary-600">
        {user.email && (
          <div className="flex items-center space-x-2">
            <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{user.email}</span>
          </div>
        )}
        {user.phone && (
          <div className="flex items-center space-x-2">
            <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{user.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}
