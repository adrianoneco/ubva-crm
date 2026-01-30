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
  profilePictureUrl?: string | null
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
    profilePictureUrl: undefined,
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
  
  // Fetch WhatsApp profile picture if phone is provided
  let profilePictureUrl = data.profilePictureUrl
  if (contact.phone && !profilePictureUrl) {
    try {
      profilePictureUrl = await fetchWhatsAppProfilePicture(contact.phone)
    } catch (err) {
      console.log(`[Contacts] Failed to fetch profile picture for ${contact.phone}:`, err)
    }
  }
  
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    company: contact.company || undefined,
    broadcastId: contact.broadcastId || undefined,
    type: 'default',
    avatar: null,
    profilePictureUrl: profilePictureUrl || undefined,
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

  // Fetch WhatsApp profile picture if phone changed and no picture yet
  let profilePictureUrl = data.profilePictureUrl
  if (data.phone && !profilePictureUrl) {
    try {
      profilePictureUrl = await fetchWhatsAppProfilePicture(data.phone)
    } catch (err) {
      console.log(`[Contacts] Failed to fetch profile picture for ${data.phone}:`, err)
    }
  }

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email || undefined,
    phone: updated.phone || undefined,
    company: updated.company || undefined,
    type: 'default',
    avatar: null,
    profilePictureUrl: profilePictureUrl || undefined,
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
    profilePictureUrl: undefined,
    createdAt: updated.createdAt?.toISOString(),
    updatedAt: updated.updatedAt?.toISOString()
  }
}

// Fetch WhatsApp profile picture from Z-API
export async function fetchWhatsAppProfilePicture(phone: string): Promise<string | null> {
  try {
    const zapiInstanceId = process.env.ZAPI_INSTANCE_ID
    const zapiInstanceToken = process.env.ZAPI_INSTANCE_TOKEN
    const zapiInstanceSecret = process.env.ZAPI_INSTANCE_SECRET

    if (!zapiInstanceId || !zapiInstanceToken || !zapiInstanceSecret) {
      console.log('[Contacts] Z-API credentials not configured')
      return null
    }

    // Normalize phone to include country code if needed
    let normalizedPhone = phone.replace(/\D/g, '')
    if (!normalizedPhone.startsWith('55')) {
      normalizedPhone = '55' + normalizedPhone
    }

    // Use the correct Z-API endpoint for profile picture
    const zapiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/profile-picture?phone=${normalizedPhone}&Client-Token=${zapiInstanceSecret}`
    
    const response = await fetch(zapiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`[Contacts] Z-API profile picture error: ${response.status}`)
      return null
    }

    const data = await response.json()
    
    // Extract profile picture URL from response
    // Z-API may return the image URL directly or in a 'profilePicture' or 'picture' field
    const pictureUrl = data.profilePicture || data.picture || data || null
    
    if (pictureUrl) {
      console.log(`[Contacts] Profile picture fetched for ${phone}: ${typeof pictureUrl === 'string' ? pictureUrl.substring(0, 50) : 'response received'}`)
      return typeof pictureUrl === 'string' ? pictureUrl : null
    }
    
    return null
  } catch (err) {
    console.error('[Contacts] Error fetching profile picture:', err)
    return null
  }
}
