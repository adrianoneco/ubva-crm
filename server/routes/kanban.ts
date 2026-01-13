import { Router } from 'express'
import { getKanbanUsers, createKanbanUser, updateKanbanUser, deleteKanbanUser } from '../utils/kanban'
import { io } from '../index'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const users = await getKanbanUsers()
    res.json(users)
  } catch (error) {
    console.error('Get kanban users error:', error)
    res.status(500).json({ error: 'Failed to fetch kanban users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, avatar, phone, email, role, kanbanStep } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const user = await createKanbanUser({ name, avatar, phone, email, role, kanbanStep })
    // Emit socket event to notify all clients
    io.emit('kanban-update')
    console.log('[Kanban] Created user, broadcasting update')
    res.status(201).json(user)
  } catch (error) {
    console.error('Create kanban user error:', error)
    res.status(500).json({ error: 'Failed to create kanban user' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, avatar, phone, email, role, kanbanStep } = req.body

    // Load previous user to check whether kanbanStep actually changed
    let previous: any = null
    try {
      const all = await getKanbanUsers()
      previous = all.find((u: any) => u.id === id)
    } catch (e) {
      // ignore
    }

    const user = await updateKanbanUser(id, { name, avatar, phone, email, role, kanbanStep })
    // Emit socket event to notify all clients
    console.log('[Kanban] Broadcasting update to', io.engine.clientsCount, 'connected clients')
    io.emit('kanban-update')
    console.log('[Kanban] Updated user', id, ', event emitted')

    const moved = previous && previous.kanbanStep !== user.kanbanStep
    // Only fire webhook when the item was moved between columns (kanbanStep changed)
    if (moved) {
      const webhookUrl = process.env.KB_WEBHOOK_URL
      if (webhookUrl) {
        ;(async () => {
          try {
            // Get the full user record (including joined appointment data) to send
            let payloadUser: any = user
            try {
              const all = await getKanbanUsers()
              const found = all.find((u: any) => u.id === user.id)
              if (found) payloadUser = found
            } catch (e) {
              // fallback to partial `user`
            }

            const payload = JSON.stringify({
              event: 'kanban_move',
              user: payloadUser,
              previousStep: previous.kanbanStep,
              newStep: user.kanbanStep,
              timestamp: new Date().toISOString(),
            })

            // If secret provided, compute HMAC-SHA256 and add X-Webhook-Signature header
            const secret = process.env.KB_WEBHOOK_SECRET
            const headers: any = { 'Content-Type': 'application/json' }

            // Add Z-API credentials from environment to webhook headers (if present)
            let zapiId = process.env.ZAPI_INSTANCE_ID
            let zapiToken = process.env.ZAPI_INSTANCE_TOKEN
            let zapiSecret = process.env.ZAPI_INSTANCE_SECRET

            // Fallback: if any Z-API var is missing, try to load .env directly
            if (!zapiId || !zapiToken || !zapiSecret) {
              try {
                const dotenv = await import('dotenv')
                const path = await import('path')
                const res = dotenv.config({ path: path.resolve(process.cwd(), '.env') })
                const parsed = res.parsed || {}
                zapiId = zapiId || parsed.ZAPI_INSTANCE_ID || process.env.ZAPI_INSTANCE_ID
                zapiToken = zapiToken || parsed.ZAPI_INSTANCE_TOKEN || process.env.ZAPI_INSTANCE_TOKEN
                zapiSecret = zapiSecret || parsed.ZAPI_INSTANCE_SECRET || process.env.ZAPI_INSTANCE_SECRET
              } catch (e) {
                // ignore
              }
            }
            if (zapiId) headers['X-ZAPI-INSTANCE-ID'] = zapiId
            if (zapiToken) headers['X-ZAPI-INSTANCE-TOKEN'] = zapiToken
            if (zapiSecret) headers['X-ZAPI-INSTANCE-SECRET'] = zapiSecret

            if (secret) {
              const crypto = await import('crypto')
              const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
              headers['X-Webhook-Signature'] = `sha256=${hmac}`
            }

            // Mask secret values for safe logging (show only start/end)
            const mask = (s?: string) => {
              if (!s) return undefined
              if (s.length <= 8) return '********'
              return `${s.slice(0, 4)}...${s.slice(-4)}`
            }
            const loggedHeaders: any = { ...headers }
            if (loggedHeaders['X-ZAPI-INSTANCE-SECRET']) {
              loggedHeaders['X-ZAPI-INSTANCE-SECRET'] = mask(loggedHeaders['X-ZAPI-INSTANCE-SECRET'])
            }
            if (loggedHeaders['X-Webhook-Signature']) {
              loggedHeaders['X-Webhook-Signature'] = mask(loggedHeaders['X-Webhook-Signature'])
            }
            console.log('[Kanban] Webhook headers (masked):', loggedHeaders)

            await fetch(webhookUrl, {
              method: 'POST',
              headers,
              body: payload,
            })
            console.log('[Kanban] Webhook sent to', webhookUrl)
          } catch (err) {
            console.error('[Kanban] Webhook error:', err)
          }
        })()
      }
    }

    res.json(user)
  } catch (error) {
    console.error('Update kanban user error:', error)
    res.status(500).json({ error: 'Failed to update kanban user' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await deleteKanbanUser(id)
    // Emit socket event to notify all clients
    io.emit('kanban-update')
    console.log('[Kanban] Deleted user', id, ', broadcasting update')
    res.status(204).send()
  } catch (error) {
    console.error('Delete kanban user error:', error)
    res.status(500).json({ error: 'Failed to delete kanban user' })
  }
})

export default router
