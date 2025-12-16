import MainLayout from '../components/MainLayout'
import KanbanBoard from '../components/KanbanBoard'

export default function WebGlass() {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WebGlass</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gerenciador de Vendas - Kanban Board</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <KanbanBoard />
        </div>
      </div>
    </MainLayout>
  )
}
