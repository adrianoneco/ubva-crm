import { useState, useEffect } from 'react'
import MainLayout from '../components/MainLayout'

export default function Settings() {
  const [tab, setTab] = useState<'geral' | 'agendamentos'>('geral')

  // Geral
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  // Agendamentos
  const [days, setDays] = useState<string[]>(['Mon','Tue','Wed','Thu','Fri'])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [intervalMinutes, setIntervalMinutes] = useState(60)

  useEffect(() => {
    const saved = localStorage.getItem('ubva_settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      setTimezone(parsed.timezone || timezone)
      setTheme(parsed.theme || theme)
      setDays(parsed.days || days)
      setStartTime(parsed.startTime || startTime)
      setEndTime(parsed.endTime || endTime)
      setIntervalMinutes(parsed.intervalMinutes || intervalMinutes)

      // Apply theme immediately if present
      const t = parsed.theme
      if (t === 'dark') document.documentElement.classList.add('dark')
      else if (t === 'light') document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDay = (d: string) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const [savedOk, setSavedOk] = useState(false)

  const applyTheme = (t: string) => {
    if (t === 'dark') document.documentElement.classList.add('dark')
    else if (t === 'light') document.documentElement.classList.remove('dark')
    // if system, remove explicit class so system preference applies
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', t === 'system' ? '' : t)
  }

  useEffect(() => {
    // apply immediately when user clicks theme buttons
    applyTheme(theme)
  }, [theme])

  const save = () => {
    localStorage.setItem('ubva_settings', JSON.stringify({ timezone, theme, days, startTime, endTime, intervalMinutes }))
    applyTheme(theme)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2000)
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Configurações</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-1 flex items-center gap-1">
              <button onClick={() => setTab('geral')} aria-pressed={tab==='geral'} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === 'geral' ? 'bg-blue-500 text-white shadow' : 'text-gray-700 dark:text-gray-300'}`}>Geral</button>
              <button onClick={() => setTab('agendamentos')} aria-pressed={tab==='agendamentos'} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === 'agendamentos' ? 'bg-blue-500 text-white shadow' : 'text-gray-700 dark:text-gray-300'}`}>Agendamentos</button>
            </div>
            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">Tema atual: <strong className="text-gray-700 dark:text-gray-200">{theme}</strong></div>
          </div>

          {tab === 'geral' ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fuso horário</label>
                  <input value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                  <small className="text-gray-500">Use um identificador IANA, ex: America/Sao_Paulo</small>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tema</label>
                  <div className="flex gap-2">
                    {['system','light','dark'].map(t => (
                      <button key={t} onClick={() => setTheme(t as any)} className={`px-3 py-2 rounded-lg text-sm font-medium ${theme === t ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferência salva</label>
                <div className="text-sm text-gray-500 dark:text-gray-400">As mudanças são aplicadas imediatamente ao tema. Para reverter, escolha 'Sistema'.</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias da semana</label>
                <div className="flex gap-2 flex-wrap">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                    <button key={d} onClick={() => toggleDay(d)} className={`px-3 py-2 rounded-lg ${days.includes(d) ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{d}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Início</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fim</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Intervalo (min)</label>
                  <input type="number" min={5} value={intervalMinutes} onChange={e => setIntervalMinutes(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
              </div>

            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-green-600" aria-live="polite">{savedOk ? 'Configurações salvas' : ''}</div>
            <div className="flex gap-2">
              <button onClick={() => { setTheme('system'); applyTheme('system') }} className="px-3 py-2 rounded-lg">Reverter</button>
              <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
