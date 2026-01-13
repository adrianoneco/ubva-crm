import { Router } from 'express'
import { db } from '../db'
import { webhooks } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

const router = Router()

// Get all configured webhooks
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(webhooks)
    const result = rows.map(r => ({
      id: r.id,
      name: r.name,
      url: r.url,
      events: JSON.parse(r.events || '[]'),
      active: r.active === 1,
      createdAt: r.createdAt.toISOString(),
    }))
    res.json(result)
  } catch (err) {
    console.error('Failed to get webhooks:', err)
    res.status(500).json({ error: 'Failed to get webhooks' })
  }
})

// Create webhook
router.post('/', async (req, res) => {
  try {
    const { name, url, events, active } = req.body
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' })
    }

    // Generate a secret for this webhook
    const secret = crypto.randomBytes(32).toString('hex')

    const [webhook] = await db.insert(webhooks).values({
      name,
      url,
      events: JSON.stringify(events || []),
      secret,
      active: active !== false ? 1 : 0,
    }).returning()

    res.status(201).json({
      ...webhook,
      events: JSON.parse(webhook.events),
      active: webhook.active === 1,
      secret, // Return secret only on creation
    })
  } catch (err) {
    console.error('Failed to create webhook:', err)
    res.status(500).json({ error: 'Failed to create webhook' })
  }
})

// Update webhook
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, url, events, active } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (url !== undefined) updateData.url = url
    if (events !== undefined) updateData.events = JSON.stringify(events)
    if (active !== undefined) updateData.active = active ? 1 : 0

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    res.json({
      ...updated,
      events: JSON.parse(updated.events),
      active: updated.active === 1,
    })
  } catch (err) {
    console.error('Failed to update webhook:', err)
    res.status(500).json({ error: 'Failed to update webhook' })
  }
})

// Delete webhook
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(webhooks).where(eq(webhooks.id, id))
    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete webhook:', err)
    res.status(500).json({ error: 'Failed to delete webhook' })
  }
})

// Regenerate webhook secret
router.post('/:id/regenerate-secret', async (req, res) => {
  try {
    const id = req.params.id
    const secret = crypto.randomBytes(32).toString('hex')

    const [updated] = await db
      .update(webhooks)
      .set({ secret })
      .where(eq(webhooks.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    res.json({ secret })
  } catch (err) {
    console.error('Failed to regenerate secret:', err)
    res.status(500).json({ error: 'Failed to regenerate secret' })
  }
})

export default router

// Helper function to dispatch webhooks (used by other routes)
export async function dispatchWebhook(event: string, payload: any) {
  try {
    const rows = await db.select().from(webhooks)
    const activeWebhooks = rows.filter(w => w.active === 1)

    for (const webhook of activeWebhooks) {
      const events = JSON.parse(webhook.events || '[]')
      
      // Check if this webhook should receive this event
      if (events.length === 0 || events.includes(event) || events.includes('*')) {
        const body = JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString(),
        })

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Add signature if secret exists
        if (webhook.secret) {
          const hmac = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
          headers['X-Webhook-Signature'] = `sha256=${hmac}`
        }

        // Fire and forget
        fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
        }).catch(err => {
          console.error(`[Webhook] Failed to send to ${webhook.url}:`, err.message)
        })

        console.log(`[Webhook] Dispatched ${event} to ${webhook.name}`)
      }
    }
  } catch (err) {
    console.error('[Webhook] Dispatch error:', err)
  }
}
