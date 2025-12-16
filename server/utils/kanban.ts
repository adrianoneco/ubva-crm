import { db } from '../db'
import { kanbanUsers } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getKanbanUsers() {
  return await db.select().from(kanbanUsers).orderBy(kanbanUsers.stepIndex)
}

export async function createKanbanUser(data: {
  name: string
  avatar?: string
  phone?: string
  email?: string
  cargo?: string
  stepIndex?: number
}) {
  const [user] = await db.insert(kanbanUsers).values({
    name: data.name,
    avatar: data.avatar || null,
    phone: data.phone || null,
    email: data.email || null,
    cargo: data.cargo || null,
    stepIndex: data.stepIndex || 0,
  }).returning()

  return user
}

export async function updateKanbanUser(
  id: number,
  data: Partial<{
    name: string
    avatar: string
    phone: string
    email: string
    cargo: string
    stepIndex: number
  }>
) {
  const [user] = await db
    .update(kanbanUsers)
    .set(data)
    .where(eq(kanbanUsers.id, id))
    .returning()

  return user
}

export async function deleteKanbanUser(id: number) {
  await db.delete(kanbanUsers).where(eq(kanbanUsers.id, id))
}
