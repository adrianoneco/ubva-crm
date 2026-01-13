// lightweight Kanban card

interface Props {
  user: any
  onDelete?: (id?: string) => void
  onSelect?: (user: any) => void
  isDragging?: boolean
  indicatorClass?: string
}

export default function KanbanCard({ user, onDelete, onSelect, isDragging, indicatorClass }: Props) {
  return (
    <div className={`bg-white dark:bg-gray-700 p-3 rounded-lg shadow ${isDragging ? 'opacity-70' : ''}`} onClick={() => onSelect?.(user)}>
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${indicatorClass || 'bg-gray-400'}`}>
            {user.name ? String(user.name).charAt(0).toUpperCase() : '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{user.name}</div>
          {user.phone && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.phone}</div>}
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(user.id) }}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Excluir"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
