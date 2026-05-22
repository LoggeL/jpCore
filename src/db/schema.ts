import { sql, relations } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';

const unixMsNow = sql`(unixepoch('subsec') * 1000)`;

export const account = sqliteTable(
  'account',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerifiedAt: integer('email_verified_at'),
    passwordHash: text('password_hash').notNull(),
    passwordAlgo: text('password_algo', {
      enum: ['argon2id', 'pbkdf2-100k', 'pbkdf2-1k'],
    }).notNull(),
    passwordSalt: text('password_salt'),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    updatedAt: integer('updated_at').notNull().default(unixMsNow),
    lastActivityAt: integer('last_activity_at').notNull().default(unixMsNow),
  },
  (t) => [uniqueIndex('account_email_unique').on(t.email)]
);

export const role = sqliteTable(
  'role',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    name: text('name', { enum: ['admin', 'user', 'dj'] }).notNull(),
  },
  (t) => [
    uniqueIndex('role_account_name_unique').on(t.accountId, t.name),
    index('role_account_idx').on(t.accountId),
  ]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    expiresAt: integer('expires_at').notNull(),
    lastUsedAt: integer('last_used_at').notNull().default(unixMsNow),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
  },
  (t) => [
    uniqueIndex('session_token_hash_unique').on(t.tokenHash),
    index('session_account_idx').on(t.accountId),
    index('session_expires_idx').on(t.expiresAt),
  ]
);

export const passwordResetToken = sqliteTable(
  'password_reset_token',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [
    uniqueIndex('prt_token_hash_unique').on(t.tokenHash),
    index('prt_account_idx').on(t.accountId),
  ]
);

export const emailVerificationToken = sqliteTable(
  'email_verification_token',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
  },
  (t) => [
    uniqueIndex('evt_token_hash_unique').on(t.tokenHash),
    index('evt_account_idx').on(t.accountId),
  ]
);

export const item = sqliteTable(
  'item',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').references(() => account.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    updatedAt: integer('updated_at').notNull().default(unixMsNow),
  },
  (t) => [index('item_account_idx').on(t.accountId)]
);

export const volunteer = sqliteTable(
  'volunteer',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    duration: text('duration').notNull(),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    updatedAt: integer('updated_at').notNull().default(unixMsNow),
  },
  (t) => [uniqueIndex('volunteer_account_unique').on(t.accountId)]
);

export const registration = sqliteTable(
  'registration',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    peopleCount: integer('people_count').notNull(),
    music: text('music'),
    createdAt: integer('created_at').notNull().default(unixMsNow),
    updatedAt: integer('updated_at').notNull().default(unixMsNow),
  },
  (t) => [
    uniqueIndex('registration_account_unique').on(t.accountId),
    check('registration_people_count_check', sql`${t.peopleCount} IN (1, 2)`),
  ]
);

export const mailDraft = sqliteTable('mail_draft', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  html: text('html').notNull(),
  createdAt: integer('created_at').notNull().default(unixMsNow),
  updatedAt: integer('updated_at').notNull().default(unixMsNow),
  lastSentAt: integer('last_sent_at'),
  lastSentTo: integer('last_sent_to'),
});

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').references(() => account.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    message: text('message').notNull(),
    meta: text('meta'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at').notNull().default(unixMsNow),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt), index('audit_log_account_idx').on(t.accountId)]
);

// Relations
export const accountRelations = relations(account, ({ many }) => ({
  roles: many(role),
  sessions: many(session),
  item: many(item),
  volunteer: many(volunteer),
  registration: many(registration),
}));

export const roleRelations = relations(role, ({ one }) => ({
  account: one(account, {
    fields: [role.accountId],
    references: [account.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  account: one(account, {
    fields: [session.accountId],
    references: [account.id],
  }),
}));

export const itemRelations = relations(item, ({ one }) => ({
  account: one(account, {
    fields: [item.accountId],
    references: [account.id],
  }),
}));

export const volunteerRelations = relations(volunteer, ({ one }) => ({
  account: one(account, {
    fields: [volunteer.accountId],
    references: [account.id],
  }),
}));

export const registrationRelations = relations(registration, ({ one }) => ({
  account: one(account, {
    fields: [registration.accountId],
    references: [account.id],
  }),
}));

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Role = typeof role.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Item = typeof item.$inferSelect;
export type Volunteer = typeof volunteer.$inferSelect;
export type Registration = typeof registration.$inferSelect;
export type MailDraft = typeof mailDraft.$inferSelect;
export type NewMailDraft = typeof mailDraft.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
