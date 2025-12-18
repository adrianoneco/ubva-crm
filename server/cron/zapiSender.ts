import { db } from '../db'
import { zapiCron } from '../db/schema'
import { eq } from 'drizzle-orm'

const POLL_INTERVAL_MS = Number(process.env.ZAPI_POLL_INTERVAL_MS) || 60_000
const BATCH_SIZE = Number(process.env.ZAPI_BATCH_SIZE) || 10
const ZAPI_URL = process.env.ZAPI_URL || 'https://api.z-api.io/execute'
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || ''

let running = false

async function processQueue() {
  if (running) return
  running = true
  try {
    const rows = await db.select().from(zapiCron).where(eq(zapiCron.status, 'pending')).limit(BATCH_SIZE)
    if (!rows || rows.length === 0) return

    for (const row of rows) {
      try {
        // payload stored as text JSON; try to parse, otherwise send raw
        let body: any = row.payload
        try { body = JSON.parse(row.payload as string) } catch (e) { body = row.payload }

        const res = await fetch(ZAPI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ZAPI_TOKEN ? { Authorization: `Bearer ${ZAPI_TOKEN}` } : {}),
          },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        })

        if (res.ok) {
          await db.update(zapiCron).set({ status: 'done' }).where(eq(zapiCron.id, row.id))
          console.log(`[zapiSender] Sent ${row.id} module=${row.module} → done`)
        } else {
          console.warn(`[zapiSender] Failed send ${row.id} module=${row.module} → status ${res.status}`)
          await db.update(zapiCron).set({ status: 'failed' }).where(eq(zapiCron.id, row.id))
        }
      } catch (err) {
        console.error('[zapiSender] Error processing row', row.id, err)
        try { await db.update(zapiCron).set({ status: 'failed' }).where(eq(zapiCron.id, row.id)) } catch (_) {}
      }
    }
  } catch (err) {
    console.error('[zapiSender] Queue processing error', err)
  } finally {
    running = false
  }
}

// Start periodic polling
setInterval(() => {
  processQueue().catch(err => console.error('[zapiSender] Unexpected error', err))
}, POLL_INTERVAL_MS)

console.log('[zapiSender] Started, polling every', POLL_INTERVAL_MS, 'ms')

export default { processQueue }
