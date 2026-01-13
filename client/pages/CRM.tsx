import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { API_URL } from '../config'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  kanbanStep: number
  createdAt?: string
  nomeFantasia?: string
  appointment?: {
    dateTime: string
    status: string
  }
}

interface DashboardSummary {
  totalLeads: number
  newToday: number
  conversionRate: number
  pendingMeetings: number
}

const KANBAN_STEPS = [
  { id: 0, name: 'Novo Lead', color: 'bg-gray-500' },
  { id: 1, name: 'Contato Inicial', color: 'bg-blue-500' },
  { id: 2, name: 'Qualificação', color: 'bg-cyan-500' },
  { id: 3, name: 'Proposta Enviada', color: 'bg-yellow-500' },
  { id: 4, name: 'Negociação', color: 'bg-orange-500' },
  { id: 5, name: 'Fechado/Ganho', color: 'bg-green-500' },
  { id: 6, name: 'Perdido', color: 'bg-red-500' },
]

export default function CRM() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummary>({
    totalLeads: 0,
    newToday: 0,
    conversionRate: 0,
    pendingMeetings: 0,
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/kanban`)
      const data: Lead[] = await res.json()
      setLeads(data)

      // Calculate summary
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const newToday = data.filter(l => l.createdAt && new Date(l.createdAt) >= today).length
      const closedWon = data.filter(l => l.kanbanStep === 5).length
      const conversionRate = data.length > 0 ? (closedWon / data.length) * 100 : 0
      const pendingMeetings = data.filter(l => l.appointment?.status === 'pending' || l.appointment?.status === 'agendado').length

      setSummary({
        totalLeads: data.length,
        newToday,
        conversionRate,
        pendingMeetings,
      })
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStepInfo = (step: number) => KANBAN_STEPS.find(s => s.id === step) || KANBAN_STEPS[0]

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Resumo do relacionamento com clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/webglass')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              Pipeline
            </button>
            <button
              onClick={fetchLeads}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalLeads}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Novos Hoje</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{summary.newToday}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Conversão</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reuniões Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.pendingMeetings}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pipeline de Vendas</h3>
            <button
              onClick={() => navigate('/webglass')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Abrir Kanban
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {KANBAN_STEPS.map(step => {
              const count = leads.filter(l => l.kanbanStep === step.id).length
              return (
                <div
                  key={step.id}
                  onClick={() => navigate('/webglass')}
                  className="cursor-pointer p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-center"
                >
                  <div className={`w-3 h-3 ${step.color} rounded-full mx-auto mb-2`}></div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{step.name}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leads Recentes</h3>
            <button
              onClick={() => navigate('/contacts')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {leads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full text-white ${getStepInfo(lead.kanbanStep).color}`}>
                  {getStepInfo(lead.kanbanStep).name}
                </span>
              </div>
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum lead encontrado
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/webglass')}
            className="flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-all">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Gerenciar Pipeline</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Abrir Kanban completo</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/contacts')}
            className="flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-all">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-white transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Ver Contatos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciar todos os contatos</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/agendamento')}
            className="flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all group"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-all">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 dark:text-white">Agendamentos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ver reuniões agendadas</p>
            </div>
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
