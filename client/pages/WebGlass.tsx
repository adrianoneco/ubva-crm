import { useState, useEffect } from 'react'
import MainLayout from '../components/MainLayout'
import KanbanBoard from '../components/KanbanBoard'

export default function WebGlass() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/kanban')
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error('API connection failed:', err)
        setError(err instanceof Error ? err.message : 'Falha ao conectar ao servidor')
        setLoading(false)
      }
    }

    testAPI()
  }, [])

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
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">Erro de Conexão</h3>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-2">Certifique-se de que o servidor está rodando em http://localhost:3001</p>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 flex items-center justify-center min-h-96">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <KanbanBoard />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
