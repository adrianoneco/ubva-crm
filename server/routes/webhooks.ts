import { Router, Request, Response } from 'express'
import { db } from '../db'
import { zapiCron } from '../db/schema'
import { randomUUID } from 'crypto'

const router = Router()

// Simple API key middleware
function verifyApiKey(req: Request, res: Response, next: any) {
  const apiKey = req.headers['x-api-key'] as string | undefined
  if (!apiKey || apiKey !== process.env.GLOBAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' })
  }
  next()
}

// Endpoint for n8n to create zapi_cron jobs
// POST /api/webhook/n8n
// Body: { module: string, payload: any, execution_datetime?: string }
router.post('/n8n', verifyApiKey, async (req: Request, res: Response) => {
  try {
    const { module, payload, execution_datetime } = req.body
    if (!module || !payload) return res.status(400).json({ error: 'module and payload are required' })

    const execDate = execution_datetime ? new Date(execution_datetime) : null

    const [row] = await db.insert(zapiCron).values({
      id: randomUUID(),
      module,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      status: 'pending',
      executionDatetime: execDate || null,
    }).returning()

    res.status(201).json(row)
  } catch (err) {
    console.error('[Webhooks] n8n create job error:', err)
    res.status(500).json({ error: 'Failed to create job' })
  }
})

export default router
