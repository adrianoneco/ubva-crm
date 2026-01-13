import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'
import MeetingScheduler from '../components/MeetingScheduler'
import { API_URL } from '../config'

interface ScheduleRequest {
  id: string
  name: string
  pictureUrl?: string
  phone: string
  createdAt: string
}

export default function AgendamentoPage() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/schedule-requests`, {
        headers: {
          'x-api-key': localStorage.getItem('api_key') || '',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      }
    } catch (error) {
      console.error('Error fetching schedule requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('Deseja remover esta solicitação?')) return
    
    try {
      const response = await fetch(`${API_URL}/api/schedule-requests/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': localStorage.getItem('api_key') || '',
        },
      })
      if (response.ok) {
        setRequests(requests.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Error deleting request:', error)
    }
  }

  return (
    <MainLayout>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Agendamento</h2>
        <MeetingScheduler />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mt-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Solicitações de Agendamento
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhuma solicitação de agendamento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Foto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Telefone
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Data/Hora
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4">
                      {request.pictureUrl ? (
                        <img
                          src={request.pictureUrl}
                          alt={request.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-300 text-sm font-bold">
                            {request.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {request.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {request.phone}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(request.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
