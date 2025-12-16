import { Pool } from 'pg'

// Use environment variables already configured in server; create a small pool for raw queries
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ubva_crm',
})

export async function getBroadcastLists() {
  const res = await pool.query('SELECT id, name, description, contacts, created_at FROM broadcast_lists ORDER BY created_at DESC')
  return res.rows.map(r => ({ id: String(r.id), name: r.name, description: r.description, contacts: r.contacts || [], createdAt: r.created_at }))
}

export async function createBroadcastList(name: string, description: string | null, contactIds: string[] = []) {
  const res = await pool.query('INSERT INTO broadcast_lists (name, description, contacts) VALUES ($1, $2, $3) RETURNING id, name, description, contacts, created_at', [name, description, JSON.stringify(contactIds)])
  const row = res.rows[0]
  return { id: String(row.id), name: row.name, description: row.description, contacts: row.contacts || [], createdAt: row.created_at }
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  const q = await pool.query('SELECT contacts FROM broadcast_lists WHERE id = $1', [listId])
  const current = (q.rows[0]?.contacts) || []
  const unique = Array.from(new Set([...current, ...contactIds]))
  await pool.query('UPDATE broadcast_lists SET contacts = $1 WHERE id = $2', [JSON.stringify(unique), listId])
  const updated = await pool.query('SELECT id, name, description, contacts, created_at FROM broadcast_lists WHERE id = $1', [listId])
  const row = updated.rows[0]
  return { id: String(row.id), name: row.name, description: row.description, contacts: row.contacts || [], createdAt: row.created_at }
}

export async function deleteBroadcastList(id: string) {
  await pool.query('DELETE FROM broadcast_lists WHERE id = $1', [id])
}
