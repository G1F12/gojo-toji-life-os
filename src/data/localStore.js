const DB_NAME = 'gt-life-os-v6';
const STORE = 'snapshots';
const QUEUE = 'pending_queue';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);if(!request.result.objectStoreNames.contains(QUEUE))request.result.createObjectStore(QUEUE);};
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(key, mode, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = value === undefined ? tx.objectStore(STORE).get(key) : tx.objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export const readLocal = key => transact(key, 'readonly');
export const writeLocal = (key, value) => transact(key, 'readwrite', value);

export async function writePending(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(QUEUE,'readwrite');tx.objectStore(QUEUE).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
export async function clearPending(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(QUEUE,'readwrite');tx.objectStore(QUEUE).delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
