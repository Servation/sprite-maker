const DB_NAME = 'SpriteMakerDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const KEY_NAME = 'project_session';

/**
 * Open connection to IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves project video Blob and serialized ImageData lists to IndexedDB
 * @param {Blob|File} videoBlob 
 * @param {ImageData[]} frames 
 * @param {ImageData[]} processedFrames 
 * @returns {Promise<boolean>}
 */
export async function saveSessionMedia(videoBlob, frames, processedFrames) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Serialize ImageData to plain objects. TypedArrays are natively cloneable.
      const serializedFrames = frames.map(f => ({
        width: f.width,
        height: f.height,
        data: f.data
      }));
      
      const serializedProcessedFrames = processedFrames.map(f => ({
        width: f.width,
        height: f.height,
        data: f.data
      }));
      
      const record = {
        video: videoBlob,
        frames: serializedFrames,
        processedFrames: serializedProcessedFrames,
        timestamp: Date.now()
      };
      
      const request = store.put(record, KEY_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to save session media to IndexedDB:', err);
    throw err;
  }
}

/**
 * Loads and reconstructs project video Blob and ImageData arrays from IndexedDB
 * @returns {Promise<{video: Blob, frames: ImageData[], processedFrames: ImageData[]}|null>}
 */
export async function loadSessionMedia() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      
      request.onsuccess = (e) => {
        const record = e.target.result;
        if (!record) {
          resolve(null);
          return;
        }
        
        try {
          // Reconstruct ImageData arrays
          const reconstructedFrames = record.frames.map(f => 
            new ImageData(new Uint8ClampedArray(f.data), f.width, f.height)
          );
          
          const reconstructedProcessedFrames = record.processedFrames.map(f => 
            new ImageData(new Uint8ClampedArray(f.data), f.width, f.height)
          );
          
          resolve({
            video: record.video,
            frames: reconstructedFrames,
            processedFrames: reconstructedProcessedFrames
          });
        } catch (reconstructErr) {
          reject(reconstructErr);
        }
      };
      
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to load session media from IndexedDB:', err);
    throw err;
  }
}

/**
 * Clears saved project media from IndexedDB
 * @returns {Promise<boolean>}
 */
export async function clearSessionMedia() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(KEY_NAME);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
    throw err;
  }
}
