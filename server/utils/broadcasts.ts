import { db } from '../db'
import { broadcastLists, broadcastListContacts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function getBroadcastLists() {
  const lists = await db.select().from(broadcastLists).orderBy(sql`${broadcastLists.createdAt} DESC`)
  
  // Para cada lista, buscar os contatos vinculados
  const listsWithContacts = await Promise.all(lists.map(async (list) => {
    const contacts = await db
      .select({ contactId: broadcastListContacts.contactId })
      .from(broadcastListContacts)
      .where(eq(broadcastListContacts.listId, list.id))
    
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      contacts: contacts.map(c => c.contactId),
      createdAt: list.createdAt?.toISOString()
    }
  }))
  
  return listsWithContacts
}

export async function createBroadcastList(name: string, description: string | null, contactIds: string[] = []) {
  // Criar a lista
  const [list] = await db.insert(broadcastLists).values({
    id: sql`gen_random_uuid()`,
    name,
    description,
  }).returning()
  
  // Inserir os contatos na tabela de relacionamento
  if (contactIds.length > 0) {
    await db.insert(broadcastListContacts).values(
      contactIds.map(contactId => ({
        listId: list.id,
        contactId
      }))
    )
  }
  
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    contacts: contactIds,
    createdAt: list.createdAt?.toISOString()
  }
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  // Buscar contatos já existentes na lista
  const existing = await db
    .select({ contactId: broadcastListContacts.contactId })
    .from(broadcastListContacts)
    .where(eq(broadcastListContacts.listId, listId))
  
  const existingIds = new Set(existing.map(e => e.contactId))
  const newContactIds = contactIds.filter(id => !existingIds.has(id))
  
  // Inserir apenas os novos contatos
  if (newContactIds.length > 0) {
    await db.insert(broadcastListContacts).values(
      newContactIds.map(contactId => ({
        listId,
        contactId
      }))
    )
  }
  
  // Buscar lista atualizada
  const [list] = await db.select().from(broadcastLists).where(eq(broadcastLists.id, listId))
  const allContacts = await db
    .select({ contactId: broadcastListContacts.contactId })
    .from(broadcastListContacts)
    .where(eq(broadcastListContacts.listId, listId))
  
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    contacts: allContacts.map(c => c.contactId),
    createdAt: list.createdAt?.toISOString()
  }
}

export async function addContactsToListWithName(listId: string, contacts: Array<{id: string, name: string}>) {
  // Buscar contatos já existentes na lista
  const existing = await db
    .select({ contactId: broadcastListContacts.contactId })
    .from(broadcastListContacts)
    .where(eq(broadcastListContacts.listId, listId))
  
  const existingIds = new Set(existing.map(e => e.contactId))
  const newContacts = contacts.filter(c => !existingIds.has(c.id))
  
  // Inserir apenas os novos contatos com nome
  if (newContacts.length > 0) {
    await db.insert(broadcastListContacts).values(
      newContacts.map(contact => ({
        listId,
        contactId: contact.id,
        name: contact.name
      }))
    )
  }
  
  return newContacts.length
}

export async function deleteBroadcastList(id: string) {
  // Primeiro deletar os relacionamentos
  await db.delete(broadcastListContacts).where(eq(broadcastListContacts.listId, id))
  // Depois deletar a lista
  await db.delete(broadcastLists).where(eq(broadcastLists.id, id))
}
