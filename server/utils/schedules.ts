import { db } from '../db'
import { meetingSchedules } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

export async function getSchedules(startDate?: Date, endDate?: Date) {
  if (startDate && endDate) {
    return await db
      .select()
      .from(meetingSchedules)
      .where(
        and(
          gte(meetingSchedules.date, startDate),
          lte(meetingSchedules.date, endDate)
        )
      )
  }
  return await db.select().from(meetingSchedules)
}

export async function createSchedule(data: {
  kanbanUserId?: number
  date: Date
  timeSlot: string
  isAvailable: boolean
}) {
  const [schedule] = await db.insert(meetingSchedules).values({
    kanbanUserId: data.kanbanUserId || null,
    date: data.date,
    timeSlot: data.timeSlot,
    isAvailable: data.isAvailable,
  }).returning()

  return schedule
}

export async function updateSchedule(
  id: number,
  data: Partial<{
    kanbanUserId: number
    date: Date
    timeSlot: string
    isAvailable: boolean
  }>
) {
  const [schedule] = await db
    .update(meetingSchedules)
    .set(data)
    .where(eq(meetingSchedules.id, id))
    .returning()

  return schedule
}

export async function deleteSchedule(id: number) {
  await db.delete(meetingSchedules).where(eq(meetingSchedules.id, id))
}

export async function toggleScheduleAvailability(id: number) {
  const [schedule] = await db.select().from(meetingSchedules).where(eq(meetingSchedules.id, id))
  
  if (!schedule) {
    throw new Error('Schedule not found')
  }

  const [updated] = await db
    .update(meetingSchedules)
    .set({ isAvailable: !schedule.isAvailable })
    .where(eq(meetingSchedules.id, id))
    .returning()

  return updated
}
