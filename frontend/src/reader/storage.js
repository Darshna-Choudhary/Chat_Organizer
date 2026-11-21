// Tiny IndexedDB key-value store. Everything stays in this browser; nothing is sent anywhere.
const DB = 'chat-reader';
const STORE = 'kv';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const kvGet = (key) => run('readonly', (s) => s.get(key));
export const kvSet = (key, value) => run('readwrite', (s) => s.put(value, key));
export const kvDel = (key) => run('readwrite', (s) => s.delete(key));
