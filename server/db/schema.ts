import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

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

// Meeting schedules table (for WebGlass Tab 2)
export const meetingSchedules = pgTable('meeting_schedules', {
  id: serial('id').primaryKey(),
  kanbanUserId: integer('kanban_user_id').references(() => kanbanUsers.id),
  date: timestamp('date').notNull(),
  timeSlot: varchar('time_slot', { length: 50 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
