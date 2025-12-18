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
    // Manter a string ISO com timezone ao invés de converter para Date
    const toggled = await toggleAvailabilityByDateTime(date_time)
    io.emit('schedule-update')
    console.log('[Appointments] Toggled availability, broadcasting update')
    res.json(toggled)
  } catch (err) {
    console.error('Toggle appointment availability error:', err)
    // If the toggle failed because the slot is booked, return 409 Conflict
    if (err && (err.code === 'TIME_SLOT_BOOKED' || err.message === 'TIME_SLOT_BOOKED')) {
      return res.status(409).json({ error: 'Time slot already booked' })
    }
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
    
    // Filtrar agendamentos com regras de negócio usando ISO String
    // 1. Pelo menos 1h no futuro
    // 2. Horário de trabalho: 09:00-17:00 (seg-qui), 09:00-16:00 (sex)
    
    // Criar data/hora atual no timezone de São Paulo (UTC-3)
    const nowUTC = new Date()
    const nowSPTimestamp = nowUTC.getTime() - (3 * 60 * 60 * 1000) // UTC-3
    const nowSP = new Date(nowSPTimestamp)
    const currentYear = nowSP.getUTCFullYear()
    const currentMonth = nowSP.getUTCMonth() + 1
    const currentDay = nowSP.getUTCDate()
    const currentHour = nowSP.getUTCHours()
    const currentMinutes = nowSP.getUTCMinutes()
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    
    console.log(`📅 Hoje (SP): ${todayStr} ${currentHour}:${String(currentMinutes).padStart(2, '0')}`)
    console.log(`⏰ Mínimo: ${currentHour + 1}:${String(currentMinutes).padStart(2, '0')} (1h no futuro)`)
    
    const futureAppointments = disponiveisRows.filter(apt => {
      // Extrair hora diretamente da string ISO: YYYY-MM-DDTHH:mm:ss-03:00
      const dateTimeStr = typeof apt.date_time === 'string' ? apt.date_time : new Date(apt.date_time).toISOString()
      const [datepart, timepart] = dateTimeStr.split('T')
      const [hoursStr, minutesStr] = timepart.split(':')
      const aptHours = parseInt(hoursStr)
      const aptMinutes = parseInt(minutesStr)
      
      console.log(`  🔍 ${datepart} ${hoursStr}:${minutesStr}`)
      
      const isToday = datepart === todayStr
      
      // Regra 1: Se for hoje, deve estar pelo menos 1h no futuro
      if (isToday) {
        const aptTimeInMinutes = aptHours * 60 + aptMinutes
        const nowInMinutes = currentHour * 60 + currentMinutes
        const minTimeInMinutes = nowInMinutes + 60
        
        console.log(`    ⏱️  Apt: ${aptTimeInMinutes}min, Agora: ${nowInMinutes}min, Mín: ${minTimeInMinutes}min → Passa? ${aptTimeInMinutes >= minTimeInMinutes}`)
        
        // Deve ser >= 1h no futuro (não apenas >)
        if (aptTimeInMinutes < minTimeInMinutes) {
          return false
        }
      }
      
      // Extrair dia da semana
      const aptDateObj = new Date(datepart + 'T12:00:00Z')
      const dayOfWeek = aptDateObj.getUTCDay() // 0=Dom, 5=Sex
      
      // Regra 2: Horário mínimo 09:00
      if (aptHours < 9) {
        console.log(`    ❌ Antes das 9h`)
        return false
      }
      
      // Regra 3: Horário máximo - Sexta: 16:00, Seg-Qui: 17:00
      const isFriday = dayOfWeek === 5
      const maxHour = isFriday ? 16 : 17
      
      if (aptHours > maxHour) {
        console.log(`    ❌ Depois do máximo (${maxHour}h)`)
        return false
      }
      
      console.log(`    ✅ Aprovado`)
      return true
    })
    
    // Formatar para o padrão WhatsApp
    const formatted = futureAppointments.map(apt => {
      // Criar Date object (PostgreSQL já retorna com timezone correto)
      const aptDate = new Date(apt.date_time)
      
      // Extrair data e hora diretamente (já está no timezone local do servidor)
      const year = aptDate.getFullYear()
      const month = aptDate.getMonth() + 1
      const day = aptDate.getDate()
      const hours = aptDate.getHours()
      const minutes = aptDate.getMinutes()
      
      // Formatar data: "17 de dez. de 2025"
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
      const monthName = months[month - 1]
      const description = `${day} de ${monthName}. de ${year}`
      
      // Formatar hora: "13:00"
      const title = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      
      return {
        id: apt.id,
        description,
        title
      }
    })
    
    // Se não houver dados, retornar aviso
    if (formatted.length === 0) {
      console.log('[Appointments] No available appointments found for WhatsApp')
      return res.json({
        message: 'Nenhum agendamento disponível no momento',
        details: 'Não há horários disponíveis com pelo menos 1 hora de antecedência.'
      })
    }
    
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
