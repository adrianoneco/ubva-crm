import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), 'data', 'contacts')

interface ContactData {
  id?: string
  name: string
  email?: string
  phone?: string
  company?: string
  type?: string
  avatar?: string | null
  createdAt?: string
  updatedAt?: string
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readAllContacts(): Promise<ContactData[]> {
  await ensureDir()
  const types = await fs.readdir(DATA_DIR).catch(() => [])
  const all: ContactData[] = []
  for (const t of types) {
    const dir = path.join(DATA_DIR, t)
    const files = await fs.readdir(dir).catch(() => [])
    for (const f of files) {
      if (f.endsWith('.json')) {
        const content = await fs.readFile(path.join(dir, f), 'utf-8')
        const obj = JSON.parse(content)
        obj.type = t
        all.push(obj)
      }
    }
  }
  return all
}

export async function getContacts() {
  return await readAllContacts()
}

export async function createContact(data: ContactData) {
  await ensureDir()
  const type = data.type || 'default'
  const dir = path.join(DATA_DIR, type)
  await fs.mkdir(dir, { recursive: true })
  const id = uuidv4()
  const now = new Date().toISOString()
  const contact: ContactData = {
    id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
    type,
    avatar: null,
    createdAt: now,
    updatedAt: now,
  }
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(contact, null, 2))
  return contact
}

export async function updateContact(id: string, data: Partial<ContactData>) {
  const all = await readAllContacts()
  const contact = all.find(c => c.id === id)
  if (!contact) throw new Error('Contact not found')

  const oldType = contact.type || 'default'
  const newType = data.type || oldType

  const updated = {
    ...contact,
    ...data,
    updatedAt: new Date().toISOString(),
  }

  // write to new type dir if changed
  if (newType !== oldType) {
    const oldPath = path.join(DATA_DIR, oldType, `${id}.json`)
    await fs.unlink(oldPath).catch(() => {})
    const newDir = path.join(DATA_DIR, newType)
    await fs.mkdir(newDir, { recursive: true })
    await fs.writeFile(path.join(newDir, `${id}.json`), JSON.stringify({ ...updated, type: newType }, null, 2))
  } else {
    const filePath = path.join(DATA_DIR, oldType, `${id}.json`)
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2))
  }

  return updated
}

export async function deleteContact(id: string) {
  const all = await readAllContacts()
  const contact = all.find(c => c.id === id)
  if (!contact) return
  const dir = path.join(DATA_DIR, contact.type || 'default')
  await fs.unlink(path.join(dir, `${id}.json`)).catch(() => {})
  await fs.unlink(path.join(dir, `${id}-avatar.png`)).catch(() => {})
}

export async function saveAvatar(id: string, type: string, buffer: Buffer, ext: string) {
  const dir = path.join(DATA_DIR, type || 'default')
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${id}-avatar${ext}`)
  await fs.writeFile(filePath, buffer)

  // update JSON
  const jsonPath = path.join(dir, `${id}.json`)
  const content = await fs.readFile(jsonPath, 'utf-8')
  const obj = JSON.parse(content)
  obj.avatar = `/data/contacts/${type}/${id}-avatar${ext}`
  obj.updatedAt = new Date().toISOString()
  await fs.writeFile(jsonPath, JSON.stringify(obj, null, 2))
  return obj
}
