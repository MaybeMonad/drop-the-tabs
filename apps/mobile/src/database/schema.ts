import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const tabSchema = tableSchema({
  name: 'tabs',
  columns: [
    { name: 'remote_id', type: 'string', isOptional: true },
    { name: 'device_id', type: 'string' },
    { name: 'url', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'domain', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'is_pinned', type: 'boolean' },
    { name: 'group_id', type: 'number', isOptional: true },
    { name: 'favicon', type: 'string', isOptional: true },
    { name: 'last_modified', type: 'number' },
    { name: 'sync_status', type: 'string' }, // 'synced' | 'pending' | 'conflict'
  ],
});

export const deviceSchema = tableSchema({
  name: 'devices',
  columns: [
    { name: 'remote_id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'type', type: 'string' }, // 'browser' | 'mobile'
    { name: 'os', type: 'string', isOptional: true },
    { name: 'is_online', type: 'boolean' },
    { name: 'last_seen', type: 'number' },
    { name: 'public_key', type: 'string', isOptional: true },
  ],
});

export const sessionSchema = tableSchema({
  name: 'sessions',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'device_id', type: 'string', isOptional: true },
    { name: 'sync_status', type: 'string' },
  ],
});

export const sessionTabSchema = tableSchema({
  name: 'session_tabs',
  columns: [
    { name: 'session_id', type: 'string', isIndexed: true },
    { name: 'url', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'is_pinned', type: 'boolean' },
  ],
});

export const databaseSchema = appSchema({
  version: 1,
  tables: [
    tabSchema,
    deviceSchema,
    sessionSchema,
    sessionTabSchema,
  ],
});
