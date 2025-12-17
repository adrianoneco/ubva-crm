import MainLayout from '../components/MainLayout'
import KanbanBoard from '../components/KanbanBoard'
import MeetingScheduler from '../components/MeetingScheduler'
import { useState } from 'react'

export default function WebGlass() {
  const [activeTab, setActiveTab] = useState<'evolucao'|'agendamentos'>('evolucao')
  const [selectedContact, setSelectedContact] = useState<any | null>(null)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WebGlass</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gerenciador de Vendas - Kanban Board</p>
          </div>
        </div>

        {/* Tabs (outside the container) */}
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('evolucao')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'evolucao' ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow' : 'text-gray-700 dark:text-gray-300 bg-transparent border border-gray-200 dark:border-gray-700'}`}>
            Evolução
          </button>
          <button onClick={() => setActiveTab('agendamentos')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'agendamentos' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow' : 'text-gray-700 dark:text-gray-300 bg-transparent border border-gray-200 dark:border-gray-700'}`}>
            Agendamentos
          </button>
        </div>

        {/* Content with animated panes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative min-h-[420px]">
          <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'evolucao' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 -translate-y-3 pointer-events-none z-0'}`}>
            <KanbanBoard onSelect={(c) => { setSelectedContact(c); setActiveTab('agendamentos') }} />
          </div>

          <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${activeTab === 'agendamentos' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 -translate-y-3 pointer-events-none z-0'}`}>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Agendamento</h2>
              <MeetingScheduler selectedContact={selectedContact} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
