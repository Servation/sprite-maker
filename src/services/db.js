const DB_NAME = 'SpriteMakerWorkspaceDB_v2';
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
  console.log('[IndexedDB] saveSessionMedia called with:', {
    hasVideo: !!videoBlob,
    videoSize: videoBlob ? videoBlob.size : 0,
    framesCount: frames.length,
    processedFramesCount: processedFrames.length
  });
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
      request.onsuccess = () => {
        console.log('[IndexedDB] saveSessionMedia completed successfully');
        resolve(true);
      };
      request.onerror = (e) => {
        console.error('[IndexedDB] saveSessionMedia failed request:', e.target.error);
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] saveSessionMedia caught exception:', err);
    throw err;
  }
}

/**
 * Loads and reconstructs project video Blob and ImageData arrays from IndexedDB
 * @returns {Promise<{video: Blob, frames: ImageData[], processedFrames: ImageData[]}|null>}
 */
export async function loadSessionMedia() {
  console.log('[IndexedDB] loadSessionMedia called');
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      
      request.onsuccess = (e) => {
        const record = e.target.result;
        if (!record) {
          console.log('[IndexedDB] loadSessionMedia found no session');
          resolve(null);
          return;
        }
        
        try {
          console.log('[IndexedDB] loadSessionMedia found record, reconstructing frames...', {
            hasVideo: !!record.video,
            videoSize: record.video ? record.video.size : 0,
            framesCount: record.frames?.length,
            processedCount: record.processedFrames?.length
          });
          
          // Reconstruct ImageData arrays defensively to handle standard TypedArray clones or object maps
          const reconstructedFrames = record.frames.map(f => {
            const dataArray = f.data instanceof Uint8ClampedArray
              ? f.data
              : new Uint8ClampedArray(f.data.buffer || Object.values(f.data));
            return new ImageData(dataArray, f.width, f.height);
          });
          
          const reconstructedProcessedFrames = record.processedFrames.map(f => {
            const dataArray = f.data instanceof Uint8ClampedArray
              ? f.data
              : new Uint8ClampedArray(f.data.buffer || Object.values(f.data));
            return new ImageData(dataArray, f.width, f.height);
          });
          
          console.log('[IndexedDB] loadSessionMedia reconstruction complete');
          resolve({
            video: record.video,
            frames: reconstructedFrames,
            processedFrames: reconstructedProcessedFrames
          });
        } catch (reconstructErr) {
          console.error('[IndexedDB] loadSessionMedia reconstruction error:', reconstructErr);
          reject(reconstructErr);
        }
      };
      
      request.onerror = (e) => {
        console.error('[IndexedDB] loadSessionMedia failed request:', e.target.error);
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] loadSessionMedia caught exception:', err);
    throw err;
  }
}

/**
 * Clears saved project media from IndexedDB
 * @returns {Promise<boolean>}
 */
export async function clearSessionMedia() {
  console.log('[IndexedDB] clearSessionMedia called');
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(KEY_NAME);
      
      request.onsuccess = () => {
        console.log('[IndexedDB] clearSessionMedia completed successfully');
        resolve(true);
      };
      request.onerror = (e) => {
        console.error('[IndexedDB] clearSessionMedia failed request:', e.target.error);
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] clearSessionMedia caught exception:', err);
    throw err;
  }
}
