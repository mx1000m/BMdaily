// Simple persistent storage using a global JSON file
// This will persist across function calls in the same deployment
let globalStorage = null;

async function loadStorage() {
  if (globalStorage) return globalStorage;
  
  try {
    // Try to load from a persistent location
    const { readFile, writeFile } = await import('fs/promises');
    const { join } = await import('path');
    
    const storageFile = '/tmp/bm-notifications-storage.json';
    
    try {
      const data = await readFile(storageFile, 'utf8');
      globalStorage = JSON.parse(data);
    } catch (e) {
      // File doesn't exist, start fresh
      globalStorage = {};
    }
    
    // Save function to persist changes
    const save = async () => {
      try {
        await writeFile(storageFile, JSON.stringify(globalStorage, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to save storage:', e);
      }
    };
    
    return { ...globalStorage, save };
  } catch (e) {
    // Fallback to in-memory storage
    globalStorage = {};
    return globalStorage;
  }
}

export function getStorage() {
  return {
    async getJSON(key) {
      const storage = await loadStorage();
      return storage[key] || null;
    },
    async setJSON(key, value) {
      const storage = await loadStorage();
      storage[key] = value;
      if (storage.save) {
        await storage.save();
      }
      return true;
    },
    async delete(key) {
      const storage = await loadStorage();
      delete storage[key];
      if (storage.save) {
        await storage.save();
      }
      return true;
    }
  };
}
