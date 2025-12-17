import { Router, Request, Response, NextFunction } from 'express'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, toggleAvailabilityByDateTime } from '../utils/appointments'
import { io } from '../index'
import { db } from '../db'
import { appointments } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = Router()

// Middleware para verificar API key
function verifyApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key']
  
  if (!apiKey || apiKey !== process.env.GLOBAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' })
  }
  
  next()
}

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

// Rota protegida para buscar agendamentos disponíveis
router.get('/disponiveis', verifyApiKey, async (_req, res) => {
  try {
    const disponiveisRows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, 'disponivel'))
      .orderBy(appointments.date_time)
    
    console.log('[Appointments] Fetched', disponiveisRows.length, 'available appointments')
    res.json(disponiveisRows)
  } catch (err) {
    console.error('Get available appointments error:', err)
    res.status(500).json({ error: 'Failed to fetch available appointments' })
  }
})

// Rota protegida para buscar agendamentos disponíveis formatados para WhatsApp
router.get('/disponiveis/whatsapp', verifyApiKey, async (_req, res) => {
  try {
    const disponiveisRows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, 'disponivel'))
      .orderBy(appointments.date_time)
    
    // Filtrar apenas agendamentos com pelo menos 1 hora no futuro
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    const futureAppointments = disponiveisRows.filter(apt => {
      const aptDate = new Date(apt.date_time+"-03:00")
      return aptDate >= oneHourFromNow
    })
    
    // Formatar para o padrão WhatsApp
    const formatted = futureAppointments.map(apt => {
      const date = new Date(apt.date_time+"-03:00");
      
      // Formatar data: "17 de dez. de 2025"
      const day = date.getDate()
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      const description = `${day} de ${month}. de ${year}`
      
      // Formatar hora: "13:00"
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const title = `${hours}:${minutes}`
      
      return {
        id: apt.id,
        description,
        title
      }
    })
    
    console.log('[Appointments] Fetched', formatted.length, 'available appointments for WhatsApp')
    res.json(formatted)
  } catch (err) {
    console.error('Get available appointments for WhatsApp error:', err)
    res.status(500).json({ error: 'Failed to fetch available appointments' })
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
