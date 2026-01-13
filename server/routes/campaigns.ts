import { Router } from 'express'
import { db } from '../db'
import { campaigns, broadcastLists, broadcastListContacts, contacts } from '../db/schema'
import { eq, sql, count } from 'drizzle-orm'

const router = Router()

// Get all campaigns with broadcast list info
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        message: campaigns.message,
        status: campaigns.status,
        broadcastListId: campaigns.broadcastListId,
        scheduledAt: campaigns.scheduledAt,
        sentCount: campaigns.sentCount,
        totalCount: campaigns.totalCount,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        listName: broadcastLists.name,
      })
      .from(campaigns)
      .leftJoin(broadcastLists, eq(campaigns.broadcastListId, broadcastLists.id))
      .orderBy(campaigns.createdAt)

    const result = rows.map(r => ({
      id: r.id,
      name: r.name,
      message: r.message,
      status: r.status,
      broadcastListId: r.broadcastListId,
      scheduledAt: r.scheduledAt?.toISOString(),
      sentCount: r.sentCount,
      totalCount: r.totalCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      broadcastList: r.listName ? { id: r.broadcastListId, name: r.listName } : null,
    }))

    res.json(result)
  } catch (err) {
    console.error('Failed to get campaigns:', err)
    res.status(500).json({ error: 'Failed to get campaigns' })
  }
})

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, message, broadcastListId, scheduledAt } = req.body
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' })
    }

    // Get contact count from broadcast list
    let totalCount = 0
    if (broadcastListId) {
      const [countResult] = await db
        .select({ count: count() })
        .from(broadcastListContacts)
        .where(eq(broadcastListContacts.listId, broadcastListId))
      totalCount = countResult?.count || 0
    }

    const [campaign] = await db.insert(campaigns).values({
      name,
      message,
      broadcastListId: broadcastListId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'scheduled' : 'draft',
      totalCount,
    }).returning()

    res.status(201).json(campaign)
  } catch (err) {
    console.error('Failed to create campaign:', err)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, message, broadcastListId, scheduledAt, status } = req.body

    const updateData: any = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name
    if (message !== undefined) updateData.message = message
    if (broadcastListId !== undefined) updateData.broadcastListId = broadcastListId || null
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (status !== undefined) updateData.status = status

    // Recalculate total count if list changed
    if (broadcastListId) {
      const [countResult] = await db
        .select({ count: count() })
        .from(broadcastListContacts)
        .where(eq(broadcastListContacts.listId, broadcastListId))
      updateData.totalCount = countResult?.count || 0
    }

    const [updated] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    res.json(updated)
  } catch (err) {
    console.error('Failed to update campaign:', err)
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(campaigns).where(eq(campaigns.id, id))
    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete campaign:', err)
    res.status(500).json({ error: 'Failed to delete campaign' })
  }
})

// Start/execute campaign - sends messages via Z-API
router.post('/:id/execute', async (req, res) => {
  try {
    const id = req.params.id

    // Get campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    if (!campaign.broadcastListId) {
      return res.status(400).json({ error: 'Campaign has no broadcast list' })
    }

    // Get contacts from broadcast list
    const listContacts = await db
      .select({
        contactId: broadcastListContacts.contactId,
        phone: contacts.phone,
        name: contacts.name,
      })
      .from(broadcastListContacts)
      .innerJoin(contacts, eq(broadcastListContacts.contactId, contacts.id))
      .where(eq(broadcastListContacts.listId, campaign.broadcastListId))

    // Update campaign status
    await db
      .update(campaigns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(campaigns.id, id))

    // Queue messages via zapi_cron (will be processed by cron)
    const { zapiCron } = await import('../db/schema')
    let queued = 0

    for (const contact of listContacts) {
      if (contact.phone) {
        await db.insert(zapiCron).values({
          module: 'campaign_message',
          payload: JSON.stringify({
            campaignId: id,
            phone: contact.phone,
            name: contact.name,
            message: campaign.message,
          }),
          status: 'pending',
        })
        queued++
      }
    }

    res.json({ 
      success: true, 
      queued,
      message: `Campaign started, ${queued} messages queued` 
    })
  } catch (err) {
    console.error('Failed to execute campaign:', err)
    res.status(500).json({ error: 'Failed to execute campaign' })
  }
})

export default router
