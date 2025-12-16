import { db } from '../db'
import { contacts } from '../db/schema'
import { eq } from 'drizzle-orm'

interface ContactData {
  name: string
  email?: string
  phone?: string
  company?: string
}

export async function getContacts() {
  try {
    return await db.select().from(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    throw error
  }
}

export async function createContact(data: ContactData) {
  try {
    const [contact] = await db
      .insert(contacts)
      .values({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
      })
      .returning()
    return contact
  } catch (error) {
    console.error('Error creating contact:', error)
    throw error
  }
}

export async function updateContact(id: number, data: Partial<ContactData>) {
  try {
    const [contact] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning()
    return contact
  } catch (error) {
    console.error('Error updating contact:', error)
    throw error
  }
}

export async function deleteContact(id: number) {
  try {
    await db.delete(contacts).where(eq(contacts.id, id))
  } catch (error) {
    console.error('Error deleting contact:', error)
    throw error
  }
}
