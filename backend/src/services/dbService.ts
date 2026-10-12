import { adminDb } from '../config/firebase.js';
import fs from 'fs';
import path from 'path';

// Persistent local JSON file fallback store
const STORE_PATH = path.resolve(process.cwd(), 'backend-store.json');

const memoryStore: Record<string, Map<string, any>> = {
  users: new Map(),
  students: new Map(),
  examinations: new Map(),
  rooms: new Map(),
  allocations: new Map(),
  attendance: new Map(),
  attendanceSubmissions: new Map(),
  auditLogs: new Map(),
};

function saveToDisk() {
  try {
    const serialized: Record<string, any> = {};
    for (const [col, map] of Object.entries(memoryStore)) {
      serialized[col] = Array.from(map.entries());
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[dbService] saveToDisk error:', err);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      for (const [col, entries] of Object.entries(data)) {
        if (!memoryStore[col]) memoryStore[col] = new Map();
        if (Array.isArray(entries)) {
          memoryStore[col] = new Map(entries as [string, any][]);
        }
      }
      console.log('[dbService] Successfully restored database from persistent disk cache.');
    }
  } catch (err) {
    console.warn('[dbService] loadFromDisk error:', err);
  }
}

// Initial restore
loadFromDisk();

let firestoreAvailable = false;

// Probe Firestore availability
async function checkFirestore() {
  try {
    const testDoc = await adminDb.collection('_health').doc('ping').get();
    firestoreAvailable = true;
    return true;
  } catch (err: any) {
    firestoreAvailable = false;
    return false;
  }
}

// Initial probe
checkFirestore().catch(() => {});

export const dbService = {
  isLiveFirestore: () => firestoreAvailable,

  async getDocument<T = any>(collectionName: string, id: string): Promise<T | null> {
    if (firestoreAvailable) {
      try {
        const docSnap = await adminDb.collection(collectionName).doc(id).get();
        if (docSnap.exists) {
          return { id: docSnap.id, ...docSnap.data() } as T;
        }
        return null;
      } catch (err) {
        console.warn(`[dbService] Firestore get error on ${collectionName}/${id}, checking fallback store:`, err);
      }
    }
    const col = memoryStore[collectionName];
    if (col && col.has(id)) {
      return { id, ...col.get(id) } as T;
    }
    return null;
  },

  async setDocument(collectionName: string, id: string, data: any): Promise<void> {
    const cleaned = { ...data };
    delete cleaned.id;

    if (!memoryStore[collectionName]) {
      memoryStore[collectionName] = new Map();
    }
    memoryStore[collectionName].set(id, cleaned);
    saveToDisk();

    if (firestoreAvailable) {
      try {
        await adminDb.collection(collectionName).doc(id).set(cleaned, { merge: true });
        return;
      } catch (err) {
        console.warn(`[dbService] Firestore set error on ${collectionName}/${id}:`, err);
      }
    }
  },

  async updateDocument(collectionName: string, id: string, data: any): Promise<void> {
    const cleaned = { ...data };
    delete cleaned.id;

    if (!memoryStore[collectionName]) {
      memoryStore[collectionName] = new Map();
    }
    const existing = memoryStore[collectionName].get(id) || {};
    memoryStore[collectionName].set(id, { ...existing, ...cleaned });
    saveToDisk();

    if (firestoreAvailable) {
      try {
        await adminDb.collection(collectionName).doc(id).update(cleaned);
        return;
      } catch (err) {
        console.warn(`[dbService] Firestore update error on ${collectionName}/${id}:`, err);
      }
    }
  },

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    if (memoryStore[collectionName]) {
      memoryStore[collectionName].delete(id);
      saveToDisk();
    }
    if (firestoreAvailable) {
      try {
        await adminDb.collection(collectionName).doc(id).delete();
      } catch (err) {
        console.warn(`[dbService] Firestore delete error on ${collectionName}/${id}:`, err);
      }
    }
  },

  async queryCollection<T = any>(
    collectionName: string,
    filterFn?: (item: any) => boolean
  ): Promise<T[]> {
    if (firestoreAvailable) {
      try {
        const snapshot = await adminDb.collection(collectionName).get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (filterFn) {
          return items.filter(filterFn) as T[];
        }
        return items as T[];
      } catch (err) {
        console.warn(`[dbService] Firestore query error on ${collectionName}, falling back to store:`, err);
      }
    }

    const col = memoryStore[collectionName];
    if (!col) return [];
    const items: any[] = [];
    col.forEach((val, key) => {
      items.push({ id: key, ...val });
    });

    if (filterFn) {
      return items.filter(filterFn) as T[];
    }
    return items as T[];
  },

  async batchSet(collectionName: string, items: { id: string; data: any }[]): Promise<void> {
    if (!memoryStore[collectionName]) {
      memoryStore[collectionName] = new Map();
    }
    for (const item of items) {
      const cleaned = { ...item.data };
      delete cleaned.id;
      memoryStore[collectionName].set(item.id, cleaned);
    }
    saveToDisk();

    if (firestoreAvailable) {
      try {
        const batch = adminDb.batch();
        for (const item of items) {
          const docRef = adminDb.collection(collectionName).doc(item.id);
          const cleaned = { ...item.data };
          delete cleaned.id;
          batch.set(docRef, cleaned, { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.warn(`[dbService] Firestore batchSet error on ${collectionName}:`, err);
      }
    }
  },

  async batchDelete(collectionName: string, ids: string[]): Promise<void> {
    if (memoryStore[collectionName]) {
      for (const id of ids) {
        memoryStore[collectionName].delete(id);
      }
      saveToDisk();
    }
    if (firestoreAvailable) {
      try {
        const batch = adminDb.batch();
        for (const id of ids) {
          batch.delete(adminDb.collection(collectionName).doc(id));
        }
        await batch.commit();
      } catch (err) {
        console.warn(`[dbService] Firestore batchDelete error on ${collectionName}:`, err);
      }
    }
  }
};
