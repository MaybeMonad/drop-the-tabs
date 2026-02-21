import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ========== PAIRING ENDPOINTS ==========

// Generate pairing code
app.post('/pairing/code', async (req, res) => {
  try {
    const { deviceId, publicKey } = req.body;
    
    if (!deviceId || !publicKey) {
      return res.status(400).json({ error: 'Missing deviceId or publicKey' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.collection('pairingCodes').doc(code).set({
      deviceId,
      publicKey,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Schedule cleanup
    setTimeout(async () => {
      await db.collection('pairingCodes').doc(code).delete();
    }, 5 * 60 * 1000);

    res.json({ code, expiresIn: 300 });
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pair with code
app.post('/pairing/pair', async (req, res) => {
  try {
    const { code, deviceId, type, name, os } = req.body;

    if (!code || !deviceId || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get pairing code
    const codeDoc = await db.collection('pairingCodes').doc(code).get();
    
    if (!codeDoc.exists) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const codeData = codeDoc.data();
    
    if (codeData!.used || codeData!.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'Code expired or already used' });
    }

    // Create user
    const userId = uuidv4();
    const anonymousId = `anon_${uuidv4()}`;
    
    await db.collection('users').doc(userId).set({
      anonymousId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Register initiating device
    await db.collection('users').doc(userId).collection('devices').doc(codeData!.deviceId).set({
      deviceId: codeData!.deviceId,
      publicKey: codeData!.publicKey,
      type: 'browser',
      isOnline: true,
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    // Register new device
    await db.collection('users').doc(userId).collection('devices').doc(deviceId).set({
      deviceId,
      type,
      name: name || `${type} Device`,
      os: os || null,
      isOnline: true,
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    // Mark code as used
    await db.collection('pairingCodes').doc(code).update({ used: true });

    res.json({
      userId,
      anonymousId,
      pairedDeviceId: codeData!.deviceId,
    });
  } catch (error) {
    console.error('Pair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check pairing status
app.get('/pairing/status/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const codeDoc = await db.collection('pairingCodes').doc(code).get();
    
    if (!codeDoc.exists) {
      return res.json({ valid: false, paired: false });
    }

    const data = codeDoc.data();
    const valid = !data!.used && data!.expiresAt.toDate() > new Date();
    
    res.json({ valid, paired: data!.used });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== SYNC ENDPOINTS ==========

// Publish sync data
app.post('/sync/publish', async (req, res) => {
  try {
    const { userId, deviceId, path, payload } = req.body;

    if (!userId || !deviceId || !path || !payload) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const syncId = uuidv4();
    
    await db
      .collection('users')
      .doc(userId)
      .collection('sync')
      .doc(syncId)
      .set({
        deviceId,
        path,
        payload, // Encrypted payload
        timestamp: new Date(),
      });

    // Update presence
    await db
      .collection('users')
      .doc(userId)
      .collection('presence')
      .doc(deviceId)
      .set({
        online: true,
        lastActive: new Date(),
      });

    res.json({ success: true, syncId });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest sync data
app.get('/sync/data', async (req, res) => {
  try {
    const { userId, path } = req.query;

    if (!userId || !path) {
      return res.status(400).json({ error: 'Missing userId or path' });
    }

    const snapshot = await db
      .collection('users')
      .doc(userId as string)
      .collection('sync')
      .where('path', '==', path)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ data: null });
    }

    res.json({ data: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get devices
app.get('/sync/devices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const devicesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('devices')
      .get();

    const devices = devicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update presence
app.post('/sync/presence', async (req, res) => {
  try {
    const { userId, deviceId, isOnline } = req.body;

    await db
      .collection('users')
      .doc(userId)
      .collection('presence')
      .doc(deviceId)
      .set({
        online: isOnline,
        lastActive: new Date(),
      });

    await db
      .collection('users')
      .doc(userId)
      .collection('devices')
      .doc(deviceId)
      .update({
        isOnline,
        lastSeen: new Date(),
      });

    res.json({ success: true });
  } catch (error) {
    console.error('Presence error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Export the Express app as a Firebase Function
export const api = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  maxInstances: 10,
  invoker: 'public', // Allow public access
}, app);

// ========== SCHEDULED FUNCTIONS ==========

// Clean up old sync data (runs daily)
export const cleanupOldSyncData = onSchedule({
  schedule: '0 0 * * *', // Daily at midnight
  region: 'us-central1',
}, async (event) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const userDoc of usersSnapshot.docs) {
    const oldSync = await db
      .collection('users')
      .doc(userDoc.id)
      .collection('sync')
      .where('timestamp', '<', cutoff)
      .get();
    
    const batch = db.batch();
    oldSync.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  console.log('Cleanup completed');
});

// ========== FIRESTORE TRIGGERS ==========

// Notify other devices when sync data is created
export const onSyncCreated = onDocumentCreated({
  document: 'users/{userId}/sync/{syncId}',
  region: 'us-central1',
}, async (event) => {
  const { userId, syncId } = event.params;
  const data = event.data?.data();
  
  if (!data) return;

  // TODO: Implement real-time notification via FCM or similar
  console.log(`Sync created for user ${userId}, device ${data.deviceId}`);
});
