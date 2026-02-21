import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { databaseSchema } from './schema';
import { Tab, Device, Session, SessionTab } from './models';

const adapter = new SQLiteAdapter({
  schema: databaseSchema,
  // migrationsPaths, // Optional
  dbName: 'drop_the_tabs',
  jsi: true, // Use JSI for better performance (requires react-native-quick-crypto)
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Tab, Device, Session, SessionTab],
});
