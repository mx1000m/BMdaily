// Simple in-memory storage for notifications (will reset on function restart)
// This is a temporary solution until we get Blobs working
let storage = {};

export function getStorage() {
  return {
    async getJSON(key) {
      return storage[key] || null;
    },
    async setJSON(key, value) {
      storage[key] = value;
      return true;
    },
    async delete(key) {
      delete storage[key];
      return true;
    }
  };
}
