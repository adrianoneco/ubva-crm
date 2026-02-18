import { pgTable, varchar, timestamp, integer, text, boolean } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Authentication users table
export const users = pgTable('users', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  phone: varchar('phone', { length: 50 }),
  phoneCountry: varchar('phone_country', { length: 2 }).default('BR'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// WebGlass bot table with UUID id
export const webglassBot = pgTable('webglass_bot', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  phone: text('phone').notNull().unique(),
  step: text('step'),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  documento: text('documento'),
  lastMessageId: text('last_message_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  kanbanStep: integer('kanban_step').default(0),
  avatar: text('avatar'),
  platform: text('platform'),
  agendamentoId: text('agendamento_id'),
  feedback: text('feedback'),
  nomeFantasia: text('nome_fantasia'),
  isDone: boolean('is_done').default(false).notNull(),
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

// Campaigns table for marketing campaigns
export const campaigns = pgTable('campaigns', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  broadcastListId: text('broadcast_list_id').references(() => broadcastLists.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentCount: integer('sent_count').default(0).notNull(),
  totalCount: integer('total_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Sales table for tracking lead values and outcomes
export const sales = pgTable('sales', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  leadId: text('lead_id').notNull().references(() => webglassBot.id, { onDelete: 'cascade' }),
  value: integer('value').default(0).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  notes: text('notes'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Webhooks configuration table
export const webhooks = pgTable('webhooks', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  events: text('events').notNull(), // JSON array of event types
  secret: varchar('secret', { length: 255 }),
  active: integer('active').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Schedule requests table for tracking scheduling requests
export const scheduleRequests = pgTable('schedule_requests', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  pictureUrl: text('picture_url'),
  phone: varchar('phone', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Groups table for role-based access control
export const groups = pgTable('groups', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Permissions table
export const permissions = pgTable('permissions', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Group permissions mapping
export const groupPermissions = pgTable('group_permissions', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// User groups mapping
export const userGroups = pgTable('user_groups', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// User permission overrides (for individual user permissions)
export const userPermissionOverrides = pgTable('user_permission_overrides', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  granted: boolean('granted').notNull().default(true), // true = grant, false = deny
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// OTP codes table for password recovery
export const otpCodes = pgTable('otp_codes', {
  id: text('id').notNull().default(sql`gen_random_uuid()`).primaryKey(),
  phone: varchar('phone', { length: 50 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
})
