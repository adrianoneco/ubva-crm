import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
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
  const [clickingSlot, setClickingSlot] = useState<string | null>(null)
  const [hoveredSlots, setHoveredSlots] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSchedules()

    // Socket.io connection for real-time updates - connect to same origin
    const socketUrl = `${window.location.protocol}//${window.location.host}`
    console.log('[MeetingScheduler] Connecting to socket:', socketUrl)
    const newSocket = io(socketUrl, { path: '/socket.io' })

    newSocket.on('connect', () => {
      console.log('[MeetingScheduler] ✅ Socket connected:', newSocket.id)
    })

    newSocket.on('connect_error', (error) => {
      console.error('[MeetingScheduler] ❌ Socket connection error:', error.message)
    })

    newSocket.on('schedule-update', () => {
      console.log('[MeetingScheduler] 🔄 Schedule update received, refreshing...')
      // Não atualizar se houver slots com hover ou sendo clicados
      if (clickingSlot === null && hoveredSlots.size === 0) {
        fetchSchedules()
      } else {
        console.log('[MeetingScheduler] ⏸️ Skipping update - user is interacting')
      }
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
      console.log('[MeetingScheduler] Schedules received:', data)
      setSchedules(data)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotClick = async (timeSlot: string) => {
    setClickingSlot(timeSlot)
    
    const [hours, minutes] = timeSlot.split(':').map(v => parseInt(v))
    
    // Construir data no timezone local (America/Sao_Paulo UTC-3)
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const hoursStr = String(hours).padStart(2, '0')
    const minutesStr = String(minutes || 0).padStart(2, '0')
    
    // Construir objeto Date local e enviar em UTC ISO (evita problemas de offset)
    const slotDate = new Date(selectedDate)
    slotDate.setHours(hours, minutes || 0, 0, 0)
    const dateTimeISO = slotDate.toISOString()

    // Prevent toggling when selected day is not allowed by settings
    if (allowedDays) {
      const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const wd = names[selectedDate.getDay()]
      if (!allowedDays.includes(wd)) {
        setClickingSlot(null)
        return
      }
    }

    // Toggle appointment by datetime (server will create if missing)
    try {
      const apiUrl = getApiUrl()
      const payload: any = { date_time: dateTimeISO }
      if (selectedContact?.id) payload.contactId = selectedContact.id
      const response = await fetch(`${apiUrl}/api/agendamento/toggle-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error('Failed to toggle appointment')
      }
      
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
    } catch (error) {
      console.error('Failed to toggle appointment:', error)
    } finally {
      setClickingSlot(null)
    }
  }

  const isSlotAvailable = (timeSlot: string) => {
    const [slotHours] = timeSlot.split(':').map(v => parseInt(v))
    const schedule = schedules.find(s => {
      const aptDate = new Date(typeof s.date_time === 'string' ? s.date_time : new Date(s.date_time).toISOString())
      const isSameDay = aptDate.getFullYear() === selectedDate.getFullYear() && aptDate.getMonth() === selectedDate.getMonth() && aptDate.getDate() === selectedDate.getDate()
      const aptHours = aptDate.getHours()
      return aptHours === slotHours && isSameDay
    })
    return schedule?.status === 'disponivel' || false
  }

  const isSlotBooked = (timeSlot: string) => {
    const [slotHours] = timeSlot.split(':').map(v => parseInt(v))
    const schedule = schedules.find(s => {
      const aptDate = new Date(typeof s.date_time === 'string' ? s.date_time : new Date(s.date_time).toISOString())
      const isSameDay = aptDate.getFullYear() === selectedDate.getFullYear() && aptDate.getMonth() === selectedDate.getMonth() && aptDate.getDate() === selectedDate.getDate()
      const aptHours = aptDate.getHours()
      return aptHours === slotHours && isSameDay
    })
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {timeSlots.map(slot => {
                const [slotHours, slotMinutes] = slot.split(':').map(v => parseInt(v))
                
                // Regra 1: Pelo menos 1 hora no futuro
                const now = new Date()
                const slotDateTime = new Date(selectedDate)
                slotDateTime.setHours(slotHours, slotMinutes, 0, 0)
                const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
                
                if (slotDateTime < oneHourFromNow) {
                  return null
                }
                
                // Regra 2: Horário mínimo - 09:00 (1h após início às 08:00)
                if (slotHours < 9) {
                  return null
                }
                
                // Regra 3: Horário máximo - até 1h antes do fim de expediente
                const dayOfWeek = selectedDate.getDay() // 0=Dom, 5=Sex
                const maxHour = dayOfWeek === 5 ? 16 : 17 // Sexta até 16h, outros até 17h
                
                if (slotHours > maxHour) {
                  return null
                }
                
                // Verificar se o dia está permitido nas configurações
                if (allowedDays) {
                  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                  const weekdayName = names[selectedDate.getDay()]
                  if (!allowedDays.includes(weekdayName)) {
                    return null
                  }
                }
                
                const available = isSlotAvailable(slot)
                const booked = isSlotBooked(slot)
                const isClicking = clickingSlot === slot

                return (
                  <button
                    key={slot}
                    onClick={() => handleTimeSlotClick(slot)}
                    onMouseEnter={() => setHoveredSlots(prev => new Set(prev).add(slot))}
                    onMouseLeave={() => setHoveredSlots(prev => {
                      const next = new Set(prev)
                      next.delete(slot)
                      return next
                    })}
                    disabled={isClicking}
                    className={`
                      p-4 rounded-xl border-2 font-medium transition-all relative
                      ${isClicking ? 'opacity-50 cursor-wait' : ''}
                      ${available
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 shadow-sm'
                        : booked
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    {isClicking && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-xl">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
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
      </div>
    </div>
  )
}
