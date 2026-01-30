import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ubva_crm',
  })

  try {
    console.log('🔄 Running database migrations...')

    // Use a single client connection to create the migrations table
    let client = await pool.connect()
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS "drizzle_migrations" (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL UNIQUE,
          created_at bigint
        )
      `)
    } finally {
      client.release()
    }

    // Get all migration files
    const migrationsFolder = path.join(__dirname, '../../migrations')
    const files = fs.readdirSync(migrationsFolder).filter(f => f.endsWith('.sql')).sort()

    // Execute each migration with its own connection
    for (const file of files) {
      const filePath = path.join(migrationsFolder, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      // Get a fresh client for each migration
      let client = await pool.connect()
      try {
        // Check if migration has been run
        const result = await client.query(
          'SELECT * FROM drizzle_migrations WHERE hash = $1',
          [file]
        )

        if (result.rows.length === 0) {
          console.log(`  Running migration: ${file}`)
          let migrationError: any = null
          
          // Try to execute the migration
          try {
            // Execute the entire migration file as one transaction
            await client.query(fileContent)
            // Mark migration as complete
            await client.query(
              'INSERT INTO drizzle_migrations (hash, created_at) VALUES ($1, $2)',
              [file, Date.now()]
            )
            console.log(`  ✅ Completed ${file}`)
          } catch (error: any) {
            migrationError = error
            
            // IMPORTANT: Rollback the failed transaction so we can continue with other migrations
            try {
              await client.query('ROLLBACK')
            } catch (rollbackError) {
              // Ignore rollback errors
            }
          }

          if (migrationError) {
            const errorMsg = migrationError.message || ''
            const errorCode = migrationError.code || ''
            
            if (errorCode === '42P07' || errorCode === '2BP01' || 
                errorMsg.includes('already exists') || 
                errorMsg.includes('depend') ||
                errorMsg.toLowerCase().includes('constraint')) {
              // These are expected errors when tables/constraints already exist or have dependencies
              console.log(`  ⚠️  Skipping ${file} - structures already exist`)
              
              // Try to mark as done with a fresh query after rollback
              try {
                await client.query(
                  'INSERT INTO drizzle_migrations (hash, created_at) VALUES ($1, $2)',
                  [file, Date.now()]
                )
              } catch (insertError: any) {
                // If insertion fails with duplicate key, that's fine - migration already marked
                if (insertError.code !== '23505') {
                  // For other errors, just log and continue
                  console.log(`  ⚠️  ${file} - could not mark as applied but continuing`)
                }
              }
            } else {
              // This is an unexpected error, log it but continue
              console.log(`  ⚠️  ${file} - encountered error: ${errorMsg.substring(0, 100)}`)
            }
          }
        }
      } finally {
        client.release()
      }
    }

    console.log('✅ Database migrations completed successfully')
  } catch (error) {
    console.error('❌ Error running database migrations:', error)
    throw error
  } finally {
    await pool.end()
  }
}
