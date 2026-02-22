// Direct Firestore sync service using Firebase SDK
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  getDocs,
  orderBy,
  deleteDoc,
  type Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  type Auth,
  type User 
} from 'firebase/auth';
import type { Tab } from '@drop-the-tabs/shared-core';
import { arrayBufferToBase64 } from '@drop-the-tabs/shared-api';

// Firebase config - 使用你的项目
const firebaseConfig = {
  apiKey: "AIzaSyDo2tJiCGfvG7XrNdrHSNiMQsQZ8FCn3so",
  authDomain: "drop-the-tabs.firebaseapp.com",
  projectId: "drop-the-tabs",
  storageBucket: "drop-the-tabs.firebasestorage.app",
  messagingSenderId: "879807445789",
  appId: "1:879807445789:web:bd6a7a40b9deeb31997ff4",
  measurementId: "G-HTWYNY1XH2"
};

export class FirebaseSyncService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private user: User | null = null;
  private deviceId: string = '';
  private encryptionKey: CryptoKey | null = null;
  private seq: number = 0;
  private connected: boolean = false;

  async initialize(): Promise<void> {
    try {
      // 初始化 Firebase
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      // 匿名登录
      const result = await signInAnonymously(this.auth);
      this.user = result.user;
      
      // 获取或创建设备 ID
      const stored = await chrome.storage.local.get('device_id');
      if (stored.device_id) {
        this.deviceId = stored.device_id;
      } else {
        this.deviceId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await chrome.storage.local.set({ device_id: this.deviceId });
      }

      // 设置加密
      await this.setupEncryption();
      
      this.connected = true;
      console.log('[FirebaseSync] Connected, userId:', this.user.uid);

      // 保存 userId
      await chrome.storage.local.set({ sync_userId: this.user.uid });

    } catch (error) {
      console.error('[FirebaseSync] Init error:', error);
      throw error;
    }
  }

  async syncTabs(tabs: Tab[]): Promise<void> {
    if (!this.db || !this.user || !this.encryptionKey) {
      console.warn('[FirebaseSync] Not ready');
      return;
    }

    try {
      // 加密数据
      const encrypted = await this.encryptData(tabs);

      // 写入 Firestore
      const syncRef = doc(
        collection(this.db, 'users', this.user.uid, 'sync')
      );

      await setDoc(syncRef, {
        deviceId: this.deviceId,
        path: 'tabs',
        payload: encrypted,
        timestamp: serverTimestamp(),
      });

      console.log('[FirebaseSync] Tabs synced:', tabs.length);
    } catch (error) {
      console.error('[FirebaseSync] Sync error:', error);
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.user;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getUserId(): string | null {
    return this.user?.uid || null;
  }

  async saveSession(session: any): Promise<void> {
    if (!this.db || !this.user) {
      console.warn('[FirebaseSync] Not ready to save session');
      return;
    }

    try {
      const sessionRef = doc(collection(this.db, 'users', this.user.uid, 'sessions'));
      
      await setDoc(sessionRef, {
        ...session,
        deviceId: this.deviceId,
        createdAt: serverTimestamp(),
      });

      console.log('[FirebaseSync] Session saved:', session.name);
    } catch (error) {
      console.error('[FirebaseSync] Save session error:', error);
    }
  }

  async getSessions(): Promise<any[]> {
    if (!this.db || !this.user) return [];

    try {
      const sessionsQuery = query(
        collection(this.db, 'users', this.user.uid, 'sessions'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(sessionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[FirebaseSync] Get sessions error:', error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db || !this.user) return;

    try {
      await deleteDoc(doc(this.db, 'users', this.user.uid, 'sessions', sessionId));
      console.log('[FirebaseSync] Session deleted:', sessionId);
    } catch (error) {
      console.error('[FirebaseSync] Delete session error:', error);
    }
  }

  private async setupEncryption(): Promise<void> {
    if (!this.user) return;

    const material = `${this.deviceId}:${this.user.uid}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(material);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('drop-the-tabs-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptData(data: any): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('No encryption key');
    }

    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(json);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      plaintext
    );

    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const encryptedData = ciphertextArray.slice(0, -16);

    this.seq++;

    return {
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(encryptedData),
      authTag: arrayBufferToBase64(authTag),
      timestamp: Date.now(),
      seq: this.seq,
    };
  }
}

// Singleton
let syncService: FirebaseSyncService | null = null;

export function getFirebaseSyncService(): FirebaseSyncService {
  if (!syncService) {
    syncService = new FirebaseSyncService();
  }
  return syncService;
}
