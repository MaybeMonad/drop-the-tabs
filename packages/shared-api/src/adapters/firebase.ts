// packages/shared-api/src/adapters/firebase.ts

import type {
  SyncAdapter,
  AdapterConfig,
  AuthCredentials,
  AuthResult,
  PresenceStatus,
  Unsubscribe,
  EncryptedPayload,
  FirebaseConfig,
} from '@drop-the-tabs/shared-core';
import { BaseSyncAdapter } from '@drop-the-tabs/shared-core';

/**
 * Firebase Realtime Database adapter
 * Implements the SyncAdapter interface using Firebase
 */
export class FirebaseAdapter extends BaseSyncAdapter implements SyncAdapter {
  private firebaseConfig: FirebaseConfig;
  private app: any; // FirebaseApp
  private db: any; // Database
  private auth: any; // Auth
  protected connected: boolean = false;
  private subscriptions: Map<string, Unsubscribe> = new Map();

  constructor(config: AdapterConfig) {
    super(config);
    
    if (!config.firebaseConfig) {
      throw new Error('Firebase config is required for FirebaseAdapter');
    }
    
    this.firebaseConfig = config.firebaseConfig;
  }

  async connect(): Promise<void> {
    // Dynamically import Firebase to avoid bundling issues
    const { initializeApp } = await import('firebase/app');
    const { getDatabase, ref, onValue, onDisconnect } = await import('firebase/database');
    const { getAuth } = await import('firebase/auth');

    this.app = initializeApp(this.firebaseConfig);
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);

    // Wait for connection
    await this.waitForConnection();
    
    this.connected = true;
    this.emitConnected();
  }

  async disconnect(): Promise<void> {
    // Unsubscribe all listeners
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();

    // Close connection
    if (this.app) {
      const { deleteApp } = await import('firebase/app');
      await deleteApp(this.app);
    }

    this.connected = false;
    this.emitDisconnected();
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    const { signInAnonymously, signInWithCustomToken } = await import('firebase/auth');

    let userCredential;

    if (credentials.type === 'anonymous') {
      userCredential = await signInAnonymously(this.auth);
    } else if (credentials.type === 'custom' && credentials.token) {
      userCredential = await signInWithCustomToken(this.auth, credentials.token);
    } else {
      throw new Error('Invalid credentials for Firebase authentication');
    }

    const token = await userCredential.user.getIdToken();

    return {
      userId: userCredential.user.uid,
      token,
      expiresAt: Date.now() + 3600000, // 1 hour
    };
  }

  async refreshToken(): Promise<string> {
    if (!this.auth.currentUser) {
      throw new Error('No user is currently authenticated');
    }
    return await this.auth.currentUser.getIdToken(true);
  }

  subscribe(path: string, callback: (data: any) => void): Unsubscribe {
    const { ref, onValue } = require('firebase/database');
    
    const dbRef = ref(this.db, path);
    
    const unsubscribe = onValue(dbRef, (snapshot: any) => {
      callback(snapshot.val());
    }, (error: Error) => {
      console.error('Firebase subscription error:', error);
      this.emitError(error);
    });

    this.subscriptions.set(path, unsubscribe);
    
    return () => {
      unsubscribe();
      this.subscriptions.delete(path);
    };
  }

  async publish(path: string, data: EncryptedPayload): Promise<void> {
    const { ref, set } = await import('firebase/database');
    
    const dbRef = ref(this.db, path);
    await set(dbRef, data);
  }

  async get<T = any>(path: string): Promise<T | null> {
    const { ref, get } = await import('firebase/database');
    
    const dbRef = ref(this.db, path);
    const snapshot = await get(dbRef);
    
    return snapshot.val() as T | null;
  }

  async set<T = any>(path: string, data: T): Promise<void> {
    const { ref, set } = await import('firebase/database');
    
    const dbRef = ref(this.db, path);
    await set(dbRef, data);
  }

  async update<T = any>(path: string, updates: Partial<T>): Promise<void> {
    const { ref, update } = await import('firebase/database');
    
    const dbRef = ref(this.db, path);
    await update(dbRef, updates);
  }

  async delete(path: string): Promise<void> {
    const { ref, remove } = await import('firebase/database');
    
    const dbRef = ref(this.db, path);
    await remove(dbRef);
  }

  async setPresence(deviceId: string, status: PresenceStatus): Promise<void> {
    const { ref, onDisconnect, set } = await import('firebase/database');
    
    const presenceRef = ref(this.db, `presence/${deviceId}`);
    
    // Set online status
    await set(presenceRef, {
      ...status,
      timestamp: Date.now(),
    });

    // Set onDisconnect handler
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      online: false,
      lastActive: Date.now(),
    });
  }

  onPresenceChange(deviceId: string, callback: (status: PresenceStatus) => void): Unsubscribe {
    const { ref, onValue } = require('firebase/database');
    
    const presenceRef = ref(this.db, `presence/${deviceId}`);
    
    return onValue(presenceRef, (snapshot: any) => {
      callback(snapshot.val() || { online: false });
    });
  }

  private async waitForConnection(): Promise<void> {
    const { ref, onValue } = await import('firebase/database');
    
    const connectedRef = ref(this.db, '.info/connected');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Firebase connection timeout'));
      }, 10000);

      const unsubscribe = onValue(connectedRef, (snap: any) => {
        if (snap.val() === true) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}
