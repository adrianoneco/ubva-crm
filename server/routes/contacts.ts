import { Router, Request } from 'express'
// @ts-ignore
import multer from 'multer'
import { getContacts, createContact, updateContact, deleteContact, saveAvatar } from '../utils/contacts'

const router = Router()
const upload = multer()

router.get('/', async (_req, res) => {
  try {
    const contacts = await getContacts()
    res.json(contacts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, type } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const contact = await createContact({ name, email, phone, company, type })
    res.status(201).json(contact)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, email, phone, company, type } = req.body

    const contact = await updateContact(id, { name, email, phone, company, type })
    res.json(contact)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

router.post('/:id/avatar', upload.single('avatar'), async (req: Request, res) => {
  try {
    const id = req.params.id
    const type = req.body.type || 'default'
    const file = (req as any).file as any
    if (!file) return res.status(400).json({ error: 'No file' })
    const ext = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '.png'
    const updated = await saveAvatar(id, type, file.buffer, ext)
    res.json(updated)
  } catch (error) {
    console.error('Avatar upload failed', error)
    res.status(500).json({ error: 'Failed to upload avatar' })
  }
})

router.post('/import', async (req, res) => {
  try {
    const { contacts, createLists, listBaseName } = req.body
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Invalid payload' })

    console.log(`[Import] Recebidos ${contacts.length} contatos, createLists: ${createLists}`)

    const listsCreated: any[] = []
    const created: any[] = []
    let validContactIndex = 0

    // Se criar listas, criar ANTES de importar os contatos
    if (createLists) {
      const validContacts = contacts.filter(c => c.name)
      const chunkSize = 256
      const numLists = Math.ceil(validContacts.length / chunkSize)
      
      console.log(`[Import] Criando ${numLists} lista(s) para ${validContacts.length} contatos válidos`)
      
      // Criar todas as listas primeiro
      for (let i = 0; i < numLists; i++) {
        const index = i + 1
        const name = (numLists > 1) ? `${listBaseName} #${index}` : listBaseName
        const { createBroadcastList } = await import('../utils/broadcasts')
        const list = await createBroadcastList(name, `Importada em ${new Date().toLocaleString()}`, [])
        listsCreated.push(list)
        console.log(`[Import] Lista criada: ${list.name} (${list.id})`)
      }
    }

    // Agora importar os contatos com broadcast_id já definido
    for (const c of contacts) {
      if (!c.name) {
        console.log('[Import] Contato sem nome, ignorando')
        continue
      }
      
      console.log(`[Import] Processando contato:`, {
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company
      })
      
      // Usar broadcastId do contato se foi enviado (frontend já calculou)
      let broadcastId = c.broadcastId || null
      
      // Fallback: determinar qual lista este contato pertence (lógica antiga)
      if (!broadcastId && createLists && listsCreated.length > 0) {
        const listIndex = Math.floor(validContactIndex / 256)
        broadcastId = listsCreated[listIndex]?.id || null
        console.log(`[Import] Contato #${validContactIndex} -> Lista #${listIndex + 1} (${broadcastId})`)
      }
      
      const contact = await createContact({ 
        name: c.name, 
        email: c.email || null, 
        phone: c.phone || null, 
        company: c.company || null, 
        type: c.type || 'default',
        broadcastId 
      })
      created.push(contact)
      validContactIndex++
      
      console.log(`[Import] Contato criado: ${contact.name} - email: ${contact.email}, phone: ${contact.phone}`)
      
      // Adicionar à tabela de relacionamento se tiver lista
      if (broadcastId) {
        const { addContactsToListWithName } = await import('../utils/broadcasts')
        await addContactsToListWithName(broadcastId, [{ id: contact.id, name: contact.name }])
      }
    }

    console.log(`[Import] Total importado: ${created.length} contatos`)
    res.status(201).json({ created, count: created.length, listsCreated })
  } catch (error) {
    console.error('Import failed', error)
    res.status(500).json({ error: 'Failed to import contacts' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await deleteContact(id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' })
  }
})

export default router
