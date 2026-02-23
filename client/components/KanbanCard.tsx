// lightweight Kanban card

// Format phone number for display: 554195927699 -> (41) 9 5927-6990
function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4)
    const rest = digits.slice(4)
    if (rest.length === 9) {
      return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
    } else if (rest.length === 8) {
      return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
    }
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
  }
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }

  return phone
}

interface Props {
  user: any
  onDelete?: (id?: string) => void
  onSelect?: (user: any) => void
  isDragging?: boolean
  indicatorClass?: string
}

export default function KanbanCard({ user, onDelete, onSelect, isDragging, indicatorClass }: Props) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg 
        transition-all duration-200 cursor-pointer overflow-hidden border-l-4 
        border-blue-500 hover:border-blue-600
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-102'}
      `}
      onClick={() => onSelect?.(user)}
    >
      <div className="p-4">
        {/* Header with avatar and delete button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0"
              />
            ) : (
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-white 
                font-bold text-lg shadow-sm flex-shrink-0
                ${indicatorClass || 'bg-gradient-to-br from-blue-400 to-blue-600'}
              `}>
                {user.name ? String(user.name).charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {user.name}
              </div>
              {user.role && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {user.role}
                </div>
              )}
            </div>
          </div>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(user.id)
              }}
              className="
                p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 
                rounded-lg transition-all flex-shrink-0 ml-2
              "
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Contact Info */}
        {user.phone && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-600/50 rounded-lg">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{formatPhoneDisplay(user.phone)}</span>
          </div>
        )}

        {user.email && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-600/50 rounded-lg">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{user.email}</span>
          </div>
        )}

        {/* Footer with timestamp if available */}
        {user.createdAt && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {user.createdAt}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
