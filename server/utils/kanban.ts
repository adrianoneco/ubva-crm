import { db } from '../db'
import { webglassBot } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getKanbanUsers() {
  return await db.select().from(webglassBot).orderBy(webglassBot.kanbanStep)
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
  const [user] = await db
    .update(webglassBot)
    .set(data as any)
    .where(eq(webglassBot.id, id))
    .returning()

  return user
}

export async function deleteKanbanUser(id: string) {
  await db.delete(webglassBot).where(eq(webglassBot.id, id))
}
