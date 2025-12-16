import { db } from '../db'
import { webglassKanban } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getKanbanUsers() {
  return await db.select().from(webglassKanban).orderBy(webglassKanban.kanbanStep)
}

export async function createKanbanUser(data: {
  name: string
  avatar?: string
  phone?: string
  email?: string
  role?: string
  kanbanStep?: number
}) {
  const [user] = await db.insert(webglassKanban).values({
    id: data.id || undefined,
    name: data.name,
    avatar: data.avatar || null,
    phone: data.phone || null,
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
    .update(webglassKanban)
    .set(data as any)
    .where(eq(webglassKanban.id, id))
    .returning()

  return user
}

export async function deleteKanbanUser(id: string) {
  await db.delete(webglassKanban).where(eq(webglassKanban.id, id))
}
