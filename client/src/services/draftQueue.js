// Local storage for maintenance requests drafted while offline (CLAUDE.md
// checklist item 10 / "offline tolerance"). IndexedDB rather than
// localStorage: a draft's photo travels as a base64 data URL, which can be
// a few MB — comfortably past localStorage's ~5-10MB total budget, and
// localStorage's synchronous API would block the UI thread on that much
// data anyway.
const DB_NAME = 'hostel-maintenance-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

function openDb() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'draftId' });
      }
    };

    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);

    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveDraft({ categoryId, categoryName, description, photoDataUrl }) {
  const draft = {
    draftId: crypto.randomUUID(),
    categoryId,
    categoryName,
    description,
    photoDataUrl: photoDataUrl || null,
    savedAt: new Date().toISOString(),
  };

  await withStore('readwrite', (store) => store.add(draft));
  return draft;
}

export function getAllDrafts() {
  return withStore('readonly', (store) => store.getAll());
}

export async function deleteDraft(draftId) {
  await withStore('readwrite', (store) => store.delete(draftId));
}
