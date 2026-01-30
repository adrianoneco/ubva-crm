import { db } from '../db'
import { broadcastLists, broadcastListContacts, contacts } from '../db/schema'
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

export async function autoDistributeContactsToLists(
  baseName: string,
  prefix: string,
  contactsPerList: number,
  description?: string | null
) {
  // Buscar todos os contatos
  const allContacts = await db.select().from(contacts).orderBy(contacts.createdAt)
  
  if (allContacts.length === 0) {
    throw new Error('Nenhum contato disponível para distribuição')
  }

  // Dividir contatos em chunks
  const chunks = []
  for (let i = 0; i < allContacts.length; i += contactsPerList) {
    chunks.push(allContacts.slice(i, i + contactsPerList))
  }

  // Criar listas com os contatos distribuídos
  let listsCreated = 0
  for (let i = 0; i < chunks.length; i++) {
    const listNumber = i + 1
    const listName = prefix ? `${baseName} ${prefix}${listNumber}` : `${baseName} #${listNumber}`
    
    // Criar a lista
    const [list] = await db.insert(broadcastLists).values({
      id: sql`gen_random_uuid()`,
      name: listName,
      description: description || null,
    }).returning()
    
    // Inserir os contatos
    const contactIds = chunks[i].map(c => c.id)
    if (contactIds.length > 0) {
      await db.insert(broadcastListContacts).values(
        contactIds.map(contactId => ({
          listId: list.id,
          contactId
        }))
      )
    }
    
    listsCreated++
  }

  return listsCreated
}
