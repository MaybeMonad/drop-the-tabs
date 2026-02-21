import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  anonymousId: text('anonymous_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: text('device_id').notNull(),
  name: text('name'),
  type: text('type').notNull(), // 'browser' | 'mobile'
  os: text('os'),
  publicKey: text('public_key'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('devices_user_id_idx').on(table.userId),
  deviceIdIdx: index('devices_device_id_idx').on(table.deviceId),
}));

export const pairingCodes = pgTable('pairing_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  deviceId: text('device_id').notNull(),
  publicKey: text('public_key').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('pairing_code_idx').on(table.code),
  expiresAtIdx: index('pairing_expires_idx').on(table.expiresAt),
}));

export const syncData = pgTable('sync_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: text('device_id').notNull(),
  path: text('path').notNull(),
  payload: jsonb('payload').notNull(), // EncryptedPayload
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  userPathIdx: index('sync_user_path_idx').on(table.userId, table.path),
  deviceIdx: index('sync_device_idx').on(table.deviceId),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: text('device_id').notNull(),
  name: text('name').notNull(),
  tabs: jsonb('tabs').notNull(), // Tab[]
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
}));
