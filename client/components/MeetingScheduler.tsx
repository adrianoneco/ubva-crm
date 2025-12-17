import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '../config'

interface Schedule {
  id: string
  date_time: string
  duration_minutes?: number
  customer_name?: string
  notes?: string
  status: 'disponivel' | 'agendado'
}

export default function MeetingScheduler({ selectedContact }: { selectedContact?: { id?: string, name?: string, phone?: string } } = {}) {
  const [timeSlots, setTimeSlots] = useState<string[]>([])

  useEffect(() => {
    // load settings from localStorage (if any)
    const s = localStorage.getItem('ubva_settings')
    let start = '08:00', end = '18:00', interval = 60
    if (s) {
      try {
        const parsed = JSON.parse(s)
        start = parsed.startTime || start
        end = parsed.endTime || end
        interval = parsed.intervalMinutes || interval
        setAllowedDays(parsed.days || null)
      } catch (e) {}
    }

    const [sh, sm] = start.split(':').map((v: string) => parseInt(v))
    const [eh, em] = end.split(':').map((v: string) => parseInt(v))

    const slots: string[] = []
    let cur = new Date()
    cur.setHours(sh, sm, 0, 0)
    const endDate = new Date()
    endDate.setHours(eh, em, 0, 0)

    while (cur <= endDate) {
      slots.push(cur.toTimeString().slice(0,5))
      cur = new Date(cur.getTime() + interval * 60000)
    }

    setTimeSlots(slots)
  }, [])

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [allowedDays, setAllowedDays] = useState<string[] | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    fetchSchedules()

    // Socket.io connection for real-time updates - connect to same origin
    const socketUrl = `${window.location.protocol}//${window.location.host}`
    console.log('[MeetingScheduler] Connecting to socket:', socketUrl)
    const newSocket = io(socketUrl, { path: '/socket.io' })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('[MeetingScheduler] ✅ Socket connected:', newSocket.id)
    })

    newSocket.on('connect_error', (error) => {
      console.error('[MeetingScheduler] ❌ Socket connection error:', error.message)
    })

    newSocket.on('schedule-update', () => {
      console.log('[MeetingScheduler] 🔄 Schedule update received, refreshing...')
      fetchSchedules()
    })

    return () => {
      newSocket.disconnect()
    }
  }, [selectedDate])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      const apiUrl = getApiUrl()
      const response = await fetch(
        `${apiUrl}/api/agendamento?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await response.json()
      setSchedules(data)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotClick = async (timeSlot: string) => {
    const scheduleDate = new Date(selectedDate)
    const [hours] = timeSlot.split(':')
    scheduleDate.setHours(parseInt(hours), 0, 0, 0)

    // Prevent toggling when selected day is not allowed by settings
    if (allowedDays) {
      const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const wd = names[selectedDate.getDay()]
      if (!allowedDays.includes(wd)) return
    }

    // Toggle appointment by datetime (server will create if missing)
    try {
      const apiUrl = getApiUrl()
      const payload: any = { date_time: scheduleDate.toISOString() }
      if (selectedContact?.id) payload.contactId = selectedContact.id
      const response = await fetch(`${apiUrl}/api/agendamento/toggle-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const updated = await response.json()

      // Update local state: replace or add
      const idx = schedules.findIndex(s => new Date(s.date_time).toISOString() === new Date(updated.date_time).toISOString())
      if (idx !== -1) {
        const copy = [...schedules]
        copy[idx] = updated
        setSchedules(copy)
      } else {
        setSchedules([...schedules, updated])
      }
      // Emit socket event to notify other clients
      console.log('[MeetingScheduler] 📤 Emitting schedule-changed event')
      socket?.emit('schedule-changed')
    } catch (error) {
      console.error('Failed to toggle appointment:', error)
    }
  }

  const isSlotAvailable = (timeSlot: string) => {
    const schedule = schedules.find(
      s => new Date(s.date_time).getHours() === parseInt(timeSlot.split(':')[0]) &&
           new Date(s.date_time).toDateString() === selectedDate.toDateString()
    )
    return schedule?.status === 'disponivel' || false
  }

  const isSlotBooked = (timeSlot: string) => {
    const schedule = schedules.find(
      s => new Date(s.date_time).getHours() === parseInt(timeSlot.split(':')[0]) &&
           new Date(s.date_time).toDateString() === selectedDate.toDateString()
    )
    return !!(schedule && schedule.status === 'agendado')
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    const firstDayOfWeek = firstDay.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setSelectedDate(newDate)
  }

  const days = getDaysInMonth(selectedDate)
  const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{monthName}</h3>
          <div className="flex space-x-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isToday = day && day.toDateString() === new Date().toDateString()
            const isSelected = day && day.toDateString() === selectedDate.toDateString()
            let disabledDay = false

            if (day && allowedDays) {
              const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
              const weekdayName = names[day.getDay()]
              if (!allowedDays.includes(weekdayName)) disabledDay = true
            }

            return (
              <button
                key={index}
                onClick={() => day && !disabledDay && setSelectedDate(day)}
                disabled={!day || disabledDay}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-xl transition-all
                  ${!day ? 'invisible' : ''}
                  ${isSelected
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30'
                    : disabledDay
                      ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                  ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
                `}
              >
                {day?.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Horários - {selectedDate.toLocaleDateString('pt-BR')}
        </h3>
        {selectedContact && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
            Agendamentos para: <span className="font-semibold">{selectedContact.name || selectedContact.phone || selectedContact.id}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-gray-500 dark:text-gray-400">Carregando...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {timeSlots.map(slot => {
                const available = isSlotAvailable(slot)
                const booked = isSlotBooked(slot)

                return (
                  <button
                    key={slot}
                    onClick={() => handleTimeSlotClick(slot)}
                    className={`
                      p-4 rounded-xl border-2 font-medium transition-all
                      ${available
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 shadow-sm'
                        : booked
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="text-lg">{slot}</div>
                    <div className="text-xs mt-1">
                      {available ? 'Disponível' : booked ? 'Agendado' : 'não disponivel'}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"></div>
                <span className="text-gray-600 dark:text-gray-400">Disponível</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20"></div>
                <span className="text-gray-600 dark:text-gray-400">Agendado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"></div>
                <span className="text-gray-600 dark:text-gray-400">não disponivel</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
