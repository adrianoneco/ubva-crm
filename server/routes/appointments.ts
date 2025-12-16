import { Router } from 'express'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, toggleAvailabilityByDateTime } from '../utils/appointments'

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
    res.json(toggled)
  } catch (err) {
    console.error('Toggle appointment availability error:', err)
    res.status(500).json({ error: 'Failed to toggle appointment availability' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deleteAppointment(req.params.id)
    res.status(204).send()
  } catch (err) {
    console.error('Delete appointment error:', err)
    res.status(500).json({ error: 'Failed to delete appointment' })
  }
})

export default router
