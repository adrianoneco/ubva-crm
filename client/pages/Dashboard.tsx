import { useEffect, useState } from 'react'
import { API_URL } from '../config'

const apiUrl = API_URL

interface KanbanUser {
  id: string
  name: string
  phone: string
  email?: string
  kanbanStep: number
  createdAt?: string
  appointment?: {
    dateTime: string
    status: string
  }
}

interface Contact {
  id: string
  name: string
  phone: string
  createdAt?: string
}

interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  newLeadsWeek: number
  newLeadsMonth: number
  conversionRate: number
  scheduledMeetings: number
  completedMeetings: number
  pendingMeetings: number
  totalContacts: number
  leadsByStep: { step: number; count: number; name: string }[]
  recentActivity: { type: string; description: string; time: string }[]
  weeklyTrend: { day: string; leads: number; conversions: number }[]
}

const KANBAN_STEPS = [
  { id: 0, name: 'Novo Lead', color: 'from-gray-400 to-gray-500' },
  { id: 1, name: 'Contato Inicial', color: 'from-blue-400 to-blue-500' },
  { id: 2, name: 'Qualificação', color: 'from-cyan-400 to-cyan-500' },
  { id: 3, name: 'Proposta Enviada', color: 'from-yellow-400 to-yellow-500' },
  { id: 4, name: 'Negociação', color: 'from-orange-400 to-orange-500' },
  { id: 5, name: 'Fechado/Ganho', color: 'from-green-400 to-green-500' },
  { id: 6, name: 'Perdido', color: 'from-red-400 to-red-500' },
]

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeadsToday: 0,
    newLeadsWeek: 0,
    newLeadsMonth: 0,
    conversionRate: 0,
    scheduledMeetings: 0,
    completedMeetings: 0,
    pendingMeetings: 0,
    totalContacts: 0,
    leadsByStep: [],
    recentActivity: [],
    weeklyTrend: [],
  })
  const [loading, setLoading] = useState(true)
  const [kanbanUsers, setKanbanUsers] = useState<KanbanUser[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch kanban users and contacts in parallel
      const [kanbanRes, contactsRes] = await Promise.all([
        fetch(`${apiUrl}/api/kanban`),
        fetch(`${apiUrl}/api/contacts`),
      ])

      const kanbanData: KanbanUser[] = await kanbanRes.json()
      const contactsData: Contact[] = await contactsRes.json()

      setKanbanUsers(kanbanData)
      setContacts(contactsData)

      // Calculate statistics
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const totalLeads = kanbanData.length
      const newLeadsToday = kanbanData.filter(u => u.createdAt && new Date(u.createdAt) >= today).length
      const newLeadsWeek = kanbanData.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length
      const newLeadsMonth = kanbanData.filter(u => u.createdAt && new Date(u.createdAt) >= monthAgo).length

      // Conversion rate (leads that reached step 5 - Fechado/Ganho)
      const closedWon = kanbanData.filter(u => u.kanbanStep === 5).length
      const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0

      // Meetings stats
      const scheduledMeetings = kanbanData.filter(u => u.appointment).length
      const completedMeetings = kanbanData.filter(u => u.appointment?.status === 'completed').length
      const pendingMeetings = kanbanData.filter(u => u.appointment?.status === 'pending' || u.appointment?.status === 'agendado').length

      // Leads by step
      const leadsByStep = KANBAN_STEPS.map(step => ({
        step: step.id,
        name: step.name,
        count: kanbanData.filter(u => u.kanbanStep === step.id).length,
      }))

      // Weekly trend (last 7 days)
      const weeklyTrend = []
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
        const dayLeads = kanbanData.filter(u => {
          if (!u.createdAt) return false
          const created = new Date(u.createdAt)
          return created >= date && created < nextDate
        }).length
        const dayConversions = kanbanData.filter(u => {
          if (!u.createdAt || u.kanbanStep !== 5) return false
          const created = new Date(u.createdAt)
          return created >= date && created < nextDate
        }).length
        weeklyTrend.push({
          day: dayNames[date.getDay()],
          leads: dayLeads,
          conversions: dayConversions,
        })
      }

      // Recent activity
      const recentActivity = kanbanData
        .filter(u => u.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10)
        .map(u => ({
          type: 'lead',
          description: `Novo lead: ${u.name}`,
          time: formatRelativeTime(u.createdAt!),
        }))

      setStats({
        totalLeads,
        newLeadsToday,
        newLeadsWeek,
        newLeadsMonth,
        conversionRate,
        scheduledMeetings,
        completedMeetings,
        pendingMeetings,
        totalContacts: contactsData.length,
        leadsByStep,
        recentActivity,
        weeklyTrend,
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const getMaxLeadCount = () => Math.max(...stats.leadsByStep.map(s => s.count), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Executivo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral do desempenho da empresa</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Leads</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalLeads}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-medium text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              +{stats.newLeadsToday} hoje
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{stats.newLeadsWeek} esta semana
            </span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reuniões Agendadas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reuniões Agendadas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.scheduledMeetings}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
              {stats.pendingMeetings} pendentes
            </span>
            <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              {stats.completedMeetings} realizadas
            </span>
          </div>
        </div>

        {/* Total Contatos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Base de Contatos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalContacts}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Contatos disponíveis para campanhas
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Funil de Vendas</h3>
          <div className="space-y-3">
            {stats.leadsByStep.map((step, index) => {
              const stepInfo = KANBAN_STEPS.find(s => s.id === step.step)
              const percentage = (step.count / getMaxLeadCount()) * 100
              return (
                <div key={step.step} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{step.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${stepInfo?.color || 'from-gray-400 to-gray-500'} rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs font-medium text-white">{((step.count / stats.totalLeads) * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendência Semanal</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {stats.weeklyTrend.map((day, index) => {
              const maxLeads = Math.max(...stats.weeklyTrend.map(d => d.leads), 1)
              const height = (day.leads / maxLeads) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-36">
                    <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">{day.leads}</span>
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{day.day}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Novos leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atividade Recente</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats.recentActivity.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma atividade recente</p>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Rápido</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">Leads este mês</span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.newLeadsMonth}</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 dark:text-green-300">Vendas fechadas</span>
                <span className="text-xl font-bold text-green-700 dark:text-green-300">
                  {stats.leadsByStep.find(s => s.step === 5)?.count || 0}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700 dark:text-red-300">Leads perdidos</span>
                <span className="text-xl font-bold text-red-700 dark:text-red-300">
                  {stats.leadsByStep.find(s => s.step === 6)?.count || 0}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700 dark:text-purple-300">Em negociação</span>
                <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {stats.leadsByStep.find(s => s.step === 4)?.count || 0}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-700 dark:text-yellow-300">Propostas enviadas</span>
                <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                  {stats.leadsByStep.find(s => s.step === 3)?.count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Indicadores de Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalLeads > 0 ? ((stats.leadsByStep.find(s => s.step >= 1)?.count || 0) / stats.totalLeads * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Taxa de Contato</div>
          </div>
          <div className="text-center p-4">
            <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.totalLeads > 0 ? ((stats.leadsByStep.find(s => s.step >= 2)?.count || 0) / stats.totalLeads * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Taxa de Qualificação</div>
          </div>
          <div className="text-center p-4">
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.totalLeads > 0 ? ((stats.leadsByStep.find(s => s.step >= 3)?.count || 0) / stats.totalLeads * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Taxa de Proposta</div>
          </div>
          <div className="text-center p-4">
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Taxa de Fechamento</div>
          </div>
        </div>
      </div>
    </div>
  )
}
