import { pgTable, unique, text, integer, timestamp, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const webglassBot = pgTable("webglass_bot", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	phone: text().notNull(),
	step: integer(),
	name: text(),
	email: text(),
	role: text(),
	lastMessageId: text("last_message_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	kanbanStep: integer("kanban_step").default(0),
	avatar: text(),
}, (table) => [
	unique("webglass_bot_phone_unique").on(table.phone),
]);

export const contacts = pgTable("contacts", {
	id: text().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	company: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	password: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const broadcastLists = pgTable("broadcast_lists", {
	id: text().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const broadcastListContacts = pgTable("broadcast_list_contacts", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	listId: text("list_id").notNull(),
	contactId: text("contact_id").notNull(),
});

export const appointments = pgTable("appointments", {
	id: text().primaryKey().notNull(),
	title: text(),
	dateTime: timestamp("date_time", { mode: 'string' }).notNull(),
	durationMinutes: integer("duration_minutes").default(30).notNull(),
	customerName: text("customer_name"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	status: text().default('disponivel').notNull(),
	phone: text(),
	meetLink: text("meet_link"),
});
