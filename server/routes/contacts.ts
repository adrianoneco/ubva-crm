import { Router, Request, Response } from 'express'
// @ts-ignore
import multer from 'multer'
import { getContacts, createContact, updateContact, deleteContact, saveAvatar } from '../utils/contacts'
import { dispatchWebhook } from './webhooksConfig'

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
    const { name, email, phone, company, type, triggerInstallBot, profilePictureUrl } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const contact = await createContact({ name, email, phone, company, type, profilePictureUrl })

    // Dispatch webhook for contact.created event
    dispatchWebhook('contact.created', {
      contact,
      timestamp: new Date().toISOString()
    })

    // Dispatch webhook if triggerInstallBot is true
    if (triggerInstallBot) {
      ; (async () => {
        try {
          // Preferred: call n8n installation webhook using server-side env vars
          const n8nBase = process.env.ZAPI_N8N_WEBHOOK_URL || 'https://n8n.ubva.com.br/webhook-test/sdr-webglass'
          const clientSecret = process.env.ZAPI_INSTANCE_SECRET || process.env.ZAPI_SECRET_KEY || process.env.ZAPISECRET || ''
          const inverTextoToken = process.env.INVERTEXTO_TOKEN || process.env.INVERTEXTO || ''
          const zapiToken = process.env.ZAPI_INSTSANCE_TOKEN || process.env.ZAPI_INSTANCE_TOKEN || ''
          const instanceId = process.env.ZAPI_INSTSANCE_ID || process.env.ZAPI_INSTANCE_ID || ''

          const url = `${n8nBase}?clientSecret=${encodeURIComponent(clientSecret)}&inverTextoToken=${encodeURIComponent(inverTextoToken)}`

          const payload = JSON.stringify({
            phone: contact.phone || null,
            instanceId: instanceId,
            chatName: contact.name || '',
            senderName: contact.name || '',
            photo: '',
            text: { message: 'quero instalar o app.' }
          })

          const headers: any = {
            'Content-Type': 'application/json',
          }

          if (zapiToken) headers['z-api-token'] = zapiToken

          // Log request details (mask sensitive tokens)
          try {
            const masked = zapiToken ? `${zapiToken.slice(0, 4)}...${zapiToken.slice(-4)}` : ''
            console.log('[Contacts] Install webhook request:', { url, headers: Object.keys(headers), maskedZapiToken: masked, payload })
          } catch (e) {
            console.log('[Contacts] Install webhook request (failed to stringify debug info)')
          }

          const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: payload,
          })

          const respText = await resp.text().catch(() => '')
          let parsedResp: any = null
          try { parsedResp = JSON.parse(respText) } catch (e) { /* non-json */ }

          if (resp.ok) {
            console.log('[Contacts] Install bot webhook sent for contact:', contact.id, { status: resp.status, statusText: resp.statusText, body: parsedResp || respText })
          } else {
            console.error('[Contacts] Install bot webhook failed:', { status: resp.status, statusText: resp.statusText, body: parsedResp || respText })
          }
        } catch (err) {
          console.error('[Contacts] Install bot webhook error:', err)
        }
      })()
    }

    res.status(201).json(contact)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, email, phone, company, type, profilePictureUrl } = req.body

    const contact = await updateContact(id, { name, email, phone, company, type, profilePictureUrl })
    res.json(contact)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

router.post('/:id/avatar', upload.single('avatar'), async (req: Request, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
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

// Fetch WhatsApp profile picture via Z-API
router.post('/whatsapp-profile', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    const zapiInstanceId = process.env.ZAPI_INSTANCE_ID
    const zapiInstanceToken = process.env.ZAPI_INSTANCE_TOKEN
    const zapiInstanceSecret = process.env.ZAPI_INSTANCE_SECRET

    if (!zapiInstanceId || !zapiInstanceToken || !zapiInstanceSecret) {
      return res.status(500).json({ error: 'Z-API credentials not configured' })
    }

    // Call Z-API to get contact profile
    const phoneDigits = (phone || '').replace(/\D/g, '')
    const zapiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/contacts/${phoneDigits}`

    const zapiResponse = await fetch(zapiUrl, {
      method: 'GET',
      headers: {
        'Client-Token': zapiInstanceToken,
        'Content-Type': 'application/json'
      }
    })

    const respText = await zapiResponse.text().catch(() => '')
    if (!zapiResponse.ok) {
      console.error(`[Contacts] Z-API error for phone=${phone} (digits=${phoneDigits}):`, { status: zapiResponse.status, statusText: zapiResponse.statusText, body: respText })
      return res.status(400).json({ error: 'Failed to fetch contact from Z-API' })
    }

    let zapiData: any = {}
    try {
      zapiData = JSON.parse(respText || '{}')
    } catch (e) {
      console.warn('[Contacts] Z-API returned non-JSON response:', respText)
    }

    console.log('[Contacts] Z-API response for', { phoneDigits, zapiData })

    // Extract profile picture URL if available
    const profilePictureUrl = zapiData.picture || zapiData.profilePicture || null
    const contactName = zapiData.name || null

    res.json({
      phone,
      profile_picture_url: profilePictureUrl,
      name: contactName,
      status: 'success'
    })
  } catch (error) {
    console.error('WhatsApp profile fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch WhatsApp profile' })
  }
})

export default router
