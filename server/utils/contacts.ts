import fs from 'fs/promises'
import path from 'path'
import { db } from '../db'
import { contacts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

const DATA_DIR = path.join(process.cwd(), 'data', 'contacts')

interface ContactData {
  id?: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  type?: string
  avatar?: string | null
  broadcastId?: string | null
  createdAt?: string
  updatedAt?: string
}

export async function getContacts() {
  const rows = await db.select().from(contacts)
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email || undefined,
    phone: r.phone || undefined,
    company: r.company || undefined,
    type: 'default',
    avatar: null,
    createdAt: r.createdAt?.toISOString(),
    updatedAt: r.updatedAt?.toISOString()
  }))
}

export async function createContact(data: ContactData) {
  const [contact] = await db.insert(contacts).values({
    id: sql`gen_random_uuid()`,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
    broadcastId: data.broadcastId || null,
  }).returning()
  
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    company: contact.company || undefined,
    broadcastId: contact.broadcastId || undefined,
    type: 'default',
    avatar: null,
    createdAt: contact.createdAt?.toISOString(),
    updatedAt: contact.updatedAt?.toISOString()
  }
}

export async function updateContact(id: string, data: Partial<ContactData>) {
  const [updated] = await db.update(contacts)
    .set({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      updatedAt: new Date()
    })
    .where(eq(contacts.id, id))
    .returning()

  if (!updated) throw new Error('Contact not found')

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email || undefined,
    phone: updated.phone || undefined,
    company: updated.company || undefined,
    type: 'default',
    avatar: null,
    createdAt: updated.createdAt?.toISOString(),
    updatedAt: updated.updatedAt?.toISOString()
  }
}

export async function deleteContact(id: string) {
  await db.delete(contacts).where(eq(contacts.id, id))
  const dir = path.join(DATA_DIR, 'default')
  await fs.unlink(path.join(dir, `${id}.json`)).catch(() => {})
  await fs.unlink(path.join(dir, `${id}-avatar.png`)).catch(() => {})
}

// Normaliza telefone removendo caracteres não numéricos
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  return phone.replace(/\D/g, '')
}

// Busca contato pelo telefone normalizado
export async function findContactByPhone(phone: string | null | undefined) {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  
  const rows = await db.select().from(contacts)
  const found = rows.find(r => normalizePhone(r.phone) === normalized)
  return found || null
}

// Cria ou atualiza contato usando telefone como chave primária
export async function upsertContactByPhone(data: {
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
}) {
  if (!data.phone) {
    // Sem telefone, apenas cria novo contato
    return createContact(data)
  }
  
  const existing = await findContactByPhone(data.phone)
  
  if (existing) {
    // Atualiza contato existente
    return updateContact(existing.id, {
      name: data.name || existing.name,
      email: data.email ?? existing.email,
      phone: data.phone || existing.phone,
      company: data.company ?? existing.company,
    })
  } else {
    // Cria novo contato
    return createContact(data)
  }
}

export async function saveAvatar(id: string, type: string, buffer: Buffer, ext: string) {
  const dir = path.join(DATA_DIR, type || 'default')
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${id}-avatar${ext}`)
  await fs.writeFile(filePath, buffer)

  // update JSON
  // Para manter compatibilidade com avatares, ainda salvamos localmente
  await fs.mkdir(dir, { recursive: true })
  const avatarPath = path.join(dir, `${id}-avatar${ext}`)
  await fs.writeFile(avatarPath, buffer)
  
  // Atualizar no banco
  const [updated] = await db.update(contacts)
    .set({ updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning()
  
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email || undefined,
    phone: updated.phone || undefined,
    company: updated.company || undefined,
    type,
    avatar: `/data/contacts/${type}/${id}-avatar${ext}`,
    createdAt: updated.createdAt?.toISOString(),
    updatedAt: updated.updatedAt?.toISOString()
  }
}
