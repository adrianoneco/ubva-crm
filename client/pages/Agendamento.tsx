import MainLayout from '../components/MainLayout'
import MeetingScheduler from '../components/MeetingScheduler'

export default function AgendamentoPage() {
  return (
    <MainLayout>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Agendamento</h2>
        <MeetingScheduler />
      </div>
    </MainLayout>
  )
}
