import { useState, useEffect } from 'react'

interface Schedule {
  id: number
  kanbanUserId: number | null
  date: string
  timeSlot: string
  isAvailable: boolean
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

export default function MeetingScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSchedules()
  }, [selectedDate])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      const response = await fetch(
        `http://localhost:3001/api/schedules?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await response.json()
      setSchedules(data)
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotClick = async (timeSlot: string) => {
    const scheduleDate = new Date(selectedDate)
    const [hours] = timeSlot.split(':')
    scheduleDate.setHours(parseInt(hours), 0, 0, 0)

    // Check if schedule exists
    const existingSchedule = schedules.find(
      s => s.timeSlot === timeSlot && 
      new Date(s.date).toDateString() === selectedDate.toDateString()
    )

    if (existingSchedule) {
      // Toggle availability
      try {
        const response = await fetch(
          `http://localhost:3001/api/schedules/${existingSchedule.id}/toggle`,
          { method: 'POST' }
        )
        const updated = await response.json()
        setSchedules(schedules.map(s => s.id === updated.id ? updated : s))
      } catch (error) {
        console.error('Failed to toggle schedule:', error)
      }
    } else {
      // Create new schedule
      try {
        const response = await fetch('http://localhost:3001/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: scheduleDate.toISOString(),
            timeSlot,
            isAvailable: true,
          }),
        })
        const newSchedule = await response.json()
        setSchedules([...schedules, newSchedule])
      } catch (error) {
        console.error('Failed to create schedule:', error)
      }
    }
  }

  const isSlotAvailable = (timeSlot: string) => {
    const schedule = schedules.find(
      s => s.timeSlot === timeSlot && 
      new Date(s.date).toDateString() === selectedDate.toDateString()
    )
    return schedule?.isAvailable || false
  }

  const isSlotBooked = (timeSlot: string) => {
    const schedule = schedules.find(
      s => s.timeSlot === timeSlot && 
      new Date(s.date).toDateString() === selectedDate.toDateString()
    )
    return schedule && !schedule.isAvailable
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty slots for days before month starts
    const firstDayOfWeek = firstDay.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of month
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
      {/* Calendar */}
      <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 capitalize">{monthName}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => day && setSelectedDate(day)}
              disabled={!day}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                ${!day ? 'invisible' : ''}
                ${day && day.toDateString() === selectedDate.toDateString()
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-gray-100 text-gray-700'
                }
                ${day && day.toDateString() === new Date().toDateString()
                  ? 'ring-2 ring-blue-300'
                  : ''
                }
              `}
            >
              {day?.getDate()}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Horários - {selectedDate.toLocaleDateString('pt-BR')}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Carregando...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {TIME_SLOTS.map(slot => {
                const available = isSlotAvailable(slot)
                const booked = isSlotBooked(slot)

                return (
                  <button
                    key={slot}
                    onClick={() => handleTimeSlotClick(slot)}
                    className={`
                      p-4 rounded-lg border-2 font-medium transition-all
                      ${available
                        ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                        : booked
                        ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="text-lg">{slot}</div>
                    <div className="text-xs mt-1">
                      {available ? 'Disponível' : booked ? 'Ocupado' : 'Clique para marcar'}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50"></div>
                <span className="text-gray-600">Disponível</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-50"></div>
                <span className="text-gray-600">Ocupado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white"></div>
                <span className="text-gray-600">Não marcado</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
