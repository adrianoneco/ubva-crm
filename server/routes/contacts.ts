import { Router } from 'express'
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

router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const id = req.params.id
    const type = req.body.type || 'default'
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const ext = req.file.originalname.includes('.') ? req.file.originalname.slice(req.file.originalname.lastIndexOf('.')) : '.png'
    const updated = await saveAvatar(id, type, req.file.buffer, ext)
    res.json(updated)
  } catch (error) {
    console.error('Avatar upload failed', error)
    res.status(500).json({ error: 'Failed to upload avatar' })
  }
})

router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Invalid payload' })

    const created: any[] = []
    for (const c of contacts) {
      // require name
      if (!c.name) continue
      const contact = await createContact({ name: c.name, email: c.email || null, phone: c.phone || null, company: c.company || null, type: c.type || 'default' })
      created.push(contact)
    }

    res.status(201).json({ created, count: created.length })
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
