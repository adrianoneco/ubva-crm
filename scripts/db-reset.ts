#!/usr/bin/env node
/**
 * Database Reset Script
 * Drops all data except users table
 * Usage: bun run db:reset
 */
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg

async function resetDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'webglass_bot',
  })

  try {
    console.log('🔄 Starting database reset...')
    console.log('⚠️  This will DELETE all data except users!')
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Tables to truncate (order matters due to foreign keys)
      const tablesToTruncate = [
        'zapi_cron',
        'sales',
        'campaigns',
        'broadcast_list_contacts',
        'broadcast_lists',
        'contacts',
        'appointments',
        'webglass_bot',
      ]

      for (const table of tablesToTruncate) {
        try {
          await client.query(`TRUNCATE TABLE ${table} CASCADE`)
          console.log(`✅ Truncated: ${table}`)
        } catch (err: any) {
          if (err.code === '42P01') {
            console.log(`⏭️  Skipped (not exists): ${table}`)
          } else {
            throw err
          }
        }
      }

      // Reset sequences if any
      const sequences = await client.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `)
      
      for (const seq of sequences.rows) {
        await client.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`)
        console.log(`🔢 Reset sequence: ${seq.sequence_name}`)
      }

      await client.query('COMMIT')
      console.log('\n✅ Database reset complete!')
      console.log('📋 Users table preserved.')
      
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

resetDatabase()
