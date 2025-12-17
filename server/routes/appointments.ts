import { Router } from 'express'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, toggleAvailabilityByDateTime } from '../utils/appointments'
import { io } from '../index'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate as string) : undefined
    const end = endDate ? new Date(endDate as string) : undefined
    const rows = await getAppointments(start, end)
    res.json(rows)
  } catch (err) {
    console.error('Get appointments error:', err)
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { date_time, title, duration_minutes, customer_name, notes, status, phone, meet_link } = req.body
    if (!date_time) return res.status(400).json({ error: 'date_time is required' })
    const row = await createAppointment({ date_time: new Date(date_time), title, duration_minutes, customer_name, notes, status, phone, meet_link })
    io.emit('schedule-update')
    console.log('[Appointments] Created appointment, broadcasting update')
    res.status(201).json(row)
  } catch (err) {
    console.error('Create appointment error:', err)
    res.status(500).json({ error: 'Failed to create appointment' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updated = await updateAppointment(id, req.body)
    io.emit('schedule-update')
    console.log('[Appointments] Updated appointment', id, ', broadcasting update')
    res.json(updated)
  } catch (err) {
    console.error('Update appointment error:', err)
    res.status(500).json({ error: 'Failed to update appointment' })
  }
})

router.post('/toggle-availability', async (req, res) => {
  try {
    const { date_time } = req.body
    if (!date_time) return res.status(400).json({ error: 'date_time is required' })
    const toggled = await toggleAvailabilityByDateTime(new Date(date_time))
    io.emit('schedule-update')
    console.log('[Appointments] Toggled availability, broadcasting update')
    res.json(toggled)
  } catch (err) {
    console.error('Toggle appointment availability error:', err)
    res.status(500).json({ error: 'Failed to toggle appointment availability' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deleteAppointment(req.params.id)
    io.emit('schedule-update')
    console.log('[Appointments] Deleted appointment, broadcasting update')
    res.status(204).send()
  } catch (err) {
    console.error('Delete appointment error:', err)
    res.status(500).json({ error: 'Failed to delete appointment' })
  }
})

export default router
