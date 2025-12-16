import { db } from '../db'
import { appointments } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function getSchedules(startDate?: Date, endDate?: Date) {
  if (startDate && endDate) {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.date_time, startDate),
          lte(appointments.date_time, endDate)
        )
      )
  }
  return await db.select().from(appointments)
}

export async function createSchedule(data: {
  title?: string
  date_time: Date
  duration_minutes?: number
  customer_name?: string
  notes?: string
  status?: string
  phone?: string
  meet_link?: string
}) {
  const [schedule] = await db.insert(appointments).values({
    id: randomUUID(),
    title: data.title || null,
    date_time: data.date_time,
    duration_minutes: data.duration_minutes || 30,
    customer_name: data.customer_name || null,
    notes: data.notes || null,
    status: data.status || 'disponivel',
    phone: data.phone || null,
    meet_link: data.meet_link || null,
  }).returning()

  return schedule
}

export async function updateSchedule(
  id: string,
  data: Partial<{
    title: string
    date_time: Date
    duration_minutes: number
    customer_name: string
    notes: string
    status: string
    phone: string
    meet_link: string
  }>
) {
  const [schedule] = await db
    .update(appointments)
    .set(data)
    .where(eq(appointments.id, id))
    .returning()

  return schedule
}

export async function deleteSchedule(id: string) {
  await db.delete(appointments).where(eq(appointments.id, id))
}

export async function toggleScheduleAvailability(id: string) {
  const [schedule] = await db.select().from(appointments).where(eq(appointments.id, id))
  
  if (!schedule) {
    throw new Error('Schedule not found')
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: schedule.status === 'disponivel' ? 'indisponivel' : 'disponivel' })
    .where(eq(appointments.id, id))
    .returning()

  return updated
}
