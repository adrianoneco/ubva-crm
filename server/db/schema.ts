import { pgTable, serial, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core'

// Authentication users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Kanban users table (for WebGlass Tab 1)
export const kanbanUsers = pgTable('kanban_users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  cargo: varchar('cargo', { length: 255 }),
  stepIndex: integer('step_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// WebGlass bot table with UUID id
export const webglassBot = pgTable('webglass_bot', {
  id: text('id').notNull().primaryKey(),
  phone: text('phone'),
  step: integer('step'),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  lastMessageId: text('last_message_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  kanbanStep: integer('kanban_step').default(0),
  avatar: text('avatar'),
})

// Appointments table for Agendamento (UUID primary key)
export const appointments = pgTable('appointments', {
  id: text('id').notNull().primaryKey(),
  title: text('title'),
  date_time: timestamp('date_time').notNull(),
  duration_minutes: integer('duration_minutes').notNull().default(30),
  customer_name: text('customer_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status').notNull().default('disponivel'),
  phone: text('phone'),
  meet_link: text('meet_link'),
})

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
