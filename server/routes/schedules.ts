import { Router } from 'express'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, toggleScheduleAvailability } from '../utils/schedules'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    const start = startDate ? new Date(startDate as string) : undefined
    const end = endDate ? new Date(endDate as string) : undefined

    const schedules = await getSchedules(start, end)
    res.json(schedules)
  } catch (error) {
    console.error('Get schedules error:', error)
    res.status(500).json({ error: 'Failed to fetch schedules' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, date_time, duration_minutes, customer_name, notes, status, phone, meet_link } = req.body

    if (!date_time) {
      return res.status(400).json({ error: 'Date/time is required' })
    }

    const schedule = await createSchedule({
      title,
      date_time: new Date(date_time),
      duration_minutes,
      customer_name,
      notes,
      status,
      phone,
      meet_link,
    })
    res.status(201).json(schedule)
  } catch (error) {
    console.error('Create schedule error:', error)
    res.status(500).json({ error: 'Failed to create schedule' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { title, date_time, duration_minutes, customer_name, notes, status, phone, meet_link } = req.body

    const schedule = await updateSchedule(id, {
      title,
      date_time: date_time ? new Date(date_time) : undefined,
      duration_minutes,
      customer_name,
      notes,
      status,
      phone,
      meet_link,
    })
    res.json(schedule)
  } catch (error) {
    console.error('Update schedule error:', error)
    res.status(500).json({ error: 'Failed to update schedule' })
  }
})

router.post('/:id/toggle', async (req, res) => {
  try {
    const id = req.params.id
    const schedule = await toggleScheduleAvailability(id)
    res.json(schedule)
  } catch (error) {
    console.error('Toggle schedule error:', error)
    res.status(500).json({ error: 'Failed to toggle schedule availability' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await deleteSchedule(id)
    res.status(204).send()
  } catch (error) {
    console.error('Delete schedule error:', error)
    res.status(500).json({ error: 'Failed to delete schedule' })
  }
})

export default router
