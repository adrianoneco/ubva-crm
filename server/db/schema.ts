import { pgTable, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Authentication users table
export const users = pgTable('users', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// WebGlass bot table with UUID id
export const webglassBot = pgTable('webglass_bot', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  phone: text('phone').notNull().unique(),
  step: integer('step'),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  lastMessageId: text('last_message_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  kanbanStep: integer('kanban_step').default(0),
  avatar: text('avatar'),
  agendamentoId: text('agendamento_id'),
})

// Appointments table for Agendamento (UUID primary key)
export const appointments = pgTable('appointments', {
  id: text('id').notNull().primaryKey(),
  title: text('title'),
  // Use timestamp with time zone to store absolute instants
  // (drizzle: pass withTimezone: true)
  date_time: timestamp('date_time', { withTimezone: true }).notNull(),
  duration_minutes: integer('duration_minutes').notNull().default(60),
  customer_name: text('customer_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status').notNull().default('disponivel'),
  phone: text('phone'),
  meet_link: text('meet_link'),
})

export const zapiCron = pgTable('zapi_cron', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  module: varchar('module', { length: 255 }).notNull(),
  payload: text('payload').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  executionDatetime: timestamp('execution_datetime', { withTimezone: true }),
})

export const contacts = pgTable('contacts', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  broadcastId: text('broadcast_id'),
  isWhatsapp: integer('is_whatsapp').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const broadcastLists = pgTable('broadcast_lists', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const broadcastListContacts = pgTable('broadcast_list_contacts', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  listId: text('list_id').notNull().references(() => broadcastLists.id, { onDelete: 'cascade' }),
  contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
})
