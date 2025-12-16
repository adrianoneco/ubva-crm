import { useState } from 'react'
import MainLayout from '../components/MainLayout'
import KanbanBoard from '../components/KanbanBoard'
import MeetingScheduler from '../components/MeetingScheduler'

export default function WebGlass() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'scheduler'>('kanban')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Tab buttons for desktop and mobile */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'kanban'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            WebGlass
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'scheduler'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Agendamento
          </button>
        </div>

        {/* Content */}
        {activeTab === 'kanban' ? <KanbanBoard /> : <MeetingScheduler />}
      </div>
    </MainLayout>
  )
}
