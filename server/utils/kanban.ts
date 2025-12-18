import { db } from '../db'
import { webglassBot, appointments } from '../db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function getKanbanUsers() {
  // Fazer LEFT JOIN com appointments para pegar informações do agendamento
  const users = await db
    .select({
      id: webglassBot.id,
      name: webglassBot.name,
      phone: webglassBot.phone,
      email: webglassBot.email,
      role: webglassBot.role,
      avatar: webglassBot.avatar,
      kanbanStep: webglassBot.kanbanStep,
      createdAt: webglassBot.createdAt,
      agendamentoId: webglassBot.agendamentoId,
      appointmentDateTime: appointments.date_time,
    })
    .from(webglassBot)
    .leftJoin(appointments, eq(webglassBot.agendamentoId, appointments.id))
    .orderBy(webglassBot.kanbanStep)
  
  return users
}

export async function createKanbanUser(data: {
  name: string
  avatar?: string
  phone?: string
  email?: string
  role?: string
  kanbanStep?: number
}) {
  const { randomUUID } = await import('crypto')
  const { v4: uuidv4 } = await import('uuid')
  const [user] = await db.insert(webglassBot).values({
    id: randomUUID(),
    name: data.name,
    avatar: data.avatar || null,
    phone: data.phone ?? `unknown-${uuidv4()}`,
    email: data.email || null,
    role: data.role || null,
    kanbanStep: data.kanbanStep || 0,
  }).returning()

  return user
}

export async function updateKanbanUser(
  id: string,
  data: Partial<{
    name: string
    avatar: string
    phone: string
    email: string
    role: string
    kanbanStep: number
  }>
) {
  console.log('[Kanban Utils] Updating user', id, 'with data:', data)
  const [user] = await db
    .update(webglassBot)
    .set(data as any)
    .where(eq(webglassBot.id, id))
    .returning()

  console.log('[Kanban Utils] Updated user result:', { id: user.id, kanbanStep: user.kanbanStep })
  return user
}

export async function deleteKanbanUser(id: string) {
  await db.delete(webglassBot).where(eq(webglassBot.id, id))
}
