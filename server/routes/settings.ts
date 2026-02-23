import express from 'express'
import pg from 'pg'

const router = express.Router()

const { Pool } = pg
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ubva_crm',
})

// Helper: read setting by key
router.get('/n8n', async (_req, res) => {
    try {
        const result = await pool.query(`SELECT value FROM app_settings WHERE key = $1`, ['n8n'])
        if (result.rowCount === 0) return res.json({})
        return res.json(result.rows[0].value)
    } catch (err: any) {
        console.error('Failed to get n8n settings', err)
        res.status(500).json({ error: err.message || 'Failed to get settings' })
    }
})

router.put('/n8n', async (req, res) => {
    try {
        const value = req.body || {}
        await pool.query(`INSERT INTO app_settings(key, value, updated_at) VALUES($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`, ['n8n', value])
        res.json({ ok: true })
    } catch (err: any) {
        console.error('Failed to save n8n settings', err)
        res.status(500).json({ error: err.message || 'Failed to save settings' })
    }
})

export default router
