import { Router } from 'express'
import { db } from '../db'
import { scheduleRequests } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

const router = Router()

// Get all schedule requests
router.get('/', async (_req, res) => {
  try {
    const requests = await db
      .select()
      .from(scheduleRequests)
      .orderBy(desc(scheduleRequests.createdAt))
    res.json(requests)
  } catch (error) {
    console.error('Get schedule requests error:', error)
    res.status(500).json({ error: 'Failed to fetch schedule requests' })
  }
})

// Create schedule request
router.post('/', async (req, res) => {
  try {
    const { name, pictureUrl, phone } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }

    const [request] = await db
      .insert(scheduleRequests)
      .values({
        name,
        pictureUrl: pictureUrl || null,
        phone,
      })
      .returning()

    res.status(201).json(request)
  } catch (error) {
    console.error('Create schedule request error:', error)
    res.status(500).json({ error: 'Failed to create schedule request' })
  }
})

// Delete schedule request
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(scheduleRequests).where(eq(scheduleRequests.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Delete schedule request error:', error)
    res.status(500).json({ error: 'Failed to delete schedule request' })
  }
})

export default router
