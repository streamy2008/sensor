import { openDB } from 'idb';

const DB_NAME = 'medical-pwa-db';
const STORE_NAME = 'offline-tasks';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveOfflineTask = async (data: any) => {
  const db = await initDB();
  return db.add(STORE_NAME, { ...data, timestamp: Date.now() });
};

export const getOfflineTasks = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const clearOfflineTasks = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
};
