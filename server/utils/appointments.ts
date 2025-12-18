import { db } from '../db'
import { appointments } from '../db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function getAppointments(startDate?: Date, endDate?: Date) {
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

export async function createAppointment(data: {
  title?: string
  date_time: Date
  duration_minutes?: number
  customer_name?: string
  notes?: string
  status?: string
  phone?: string
  meet_link?: string
}) {
  const [row] = await db.insert(appointments).values({
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

  return row
}

export async function updateAppointment(id: string, data: Partial<{
  title: string
  date_time: Date
  duration_minutes: number
  customer_name: string
  notes: string
  status: string
  phone: string
  meet_link: string
}>) {
  const [row] = await db
    .update(appointments)
    .set(data as any)
    .where(eq(appointments.id, id))
    .returning()

  return row
}

export async function deleteAppointment(id: string) {
  await db.delete(appointments).where(eq(appointments.id, id))
}

export async function toggleAvailabilityByDateTime(dateTime: Date | string) {
  // Aceitar tanto Date quanto string ISO com timezone
  const dateTimeAsDate = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  const [existing] = await db.select().from(appointments).where(eq(appointments.date_time, dateTimeAsDate))
  // If an appointment is already booked at this exact datetime, do not allow toggling
  if (existing && existing.status === 'agendado') {
    const err: any = new Error('TIME_SLOT_BOOKED')
    err.code = 'TIME_SLOT_BOOKED'
    throw err
  }

  if (!existing) {
    // create as available by default when toggled
    const created = await createAppointment({ date_time: dateTimeAsDate, status: 'disponivel' })
    return created
  }

  // Toggle between 'disponivel' and 'nao_disponivel' (do NOT set 'agendado')
  const newStatus = existing.status === 'disponivel' ? 'nao_disponivel' : 'disponivel'

  const [updated] = await db
    .update(appointments)
    .set({ status: newStatus })
    .where(eq(appointments.id, existing.id))
    .returning()

  return updated
}
