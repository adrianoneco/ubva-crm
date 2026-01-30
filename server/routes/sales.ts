import { Router } from 'express'
import { db } from '../db'
import { sales, webglassBot } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

const router = Router()

// Get all sales with lead info
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: sales.id,
        leadId: sales.leadId,
        value: sales.value,
        status: sales.status,
        notes: sales.notes,
        closedAt: sales.closedAt,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
        leadName: webglassBot.name,
        leadPhone: webglassBot.phone,
        leadEmail: webglassBot.email,
        leadNomeFantasia: webglassBot.nomeFantasia,
      })
      .from(sales)
      .leftJoin(webglassBot, eq(sales.leadId, webglassBot.id))
      .orderBy(desc(sales.createdAt))

    const result = rows.map(r => ({
      id: r.id,
      leadId: r.leadId,
      value: r.value,
      status: r.status,
      notes: r.notes,
      closedAt: r.closedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lead: {
        id: r.leadId,
        name: r.leadName,
        phone: r.leadPhone,
        email: r.leadEmail,
        nomeFantasia: r.leadNomeFantasia,
      },
    }))

    res.json(result)
  } catch (err) {
    console.error('Failed to get sales:', err)
    res.status(500).json({ error: 'Failed to get sales' })
  }
})

// Get sales stats
router.get('/stats', async (_req, res) => {
  try {
    const allSales = await db.select().from(sales)
    
    const won = allSales.filter(s => s.status === 'won')
    const lost = allSales.filter(s => s.status === 'lost')
    const pending = allSales.filter(s => s.status === 'pending')
    
    const totalValueWon = won.reduce((acc, s) => acc + (s.value || 0), 0)
    const totalValuePending = pending.reduce((acc, s) => acc + (s.value || 0), 0)
    
    const total = allSales.length || 1
    const conversionRate = (won.length / total) * 100

    res.json({
      totalWon: won.length,
      totalLost: lost.length,
      totalPending: pending.length,
      totalValueWon,
      totalValuePending,
      conversionRate: Math.round(conversionRate * 10) / 10,
    })
  } catch (err) {
    console.error('Failed to get sales stats:', err)
    res.status(500).json({ error: 'Failed to get sales stats' })
  }
})

// Create sale
router.post('/', async (req, res) => {
  try {
    const { leadId, value, status, notes } = req.body
    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' })
    }

    const [sale] = await db.insert(sales).values({
      leadId,
      value: value || 0,
      status: status || 'pending',
      notes: notes || null,
      closedAt: status === 'won' || status === 'lost' ? new Date() : null,
    }).returning()

    res.status(201).json(sale)
  } catch (err) {
    console.error('Failed to create sale:', err)
    res.status(500).json({ error: 'Failed to create sale' })
  }
})

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { value, status, notes } = req.body

    const updateData: any = { updatedAt: new Date() }
    if (value !== undefined) updateData.value = value
    if (status !== undefined) {
      updateData.status = status
      if (status === 'won' || status === 'lost') {
        updateData.closedAt = new Date()
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const [updated] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Sale not found' })
    }

    res.json(updated)
  } catch (err) {
    console.error('Failed to update sale:', err)
    res.status(500).json({ error: 'Failed to update sale' })
  }
})

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(sales).where(eq(sales.id, id))
    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete sale:', err)
    res.status(500).json({ error: 'Failed to delete sale' })
  }
})

export default router
