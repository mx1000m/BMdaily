// Simple persistent storage using Netlify's file system
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const STORAGE_DIR = '/tmp/bm-notifications';

async function ensureStorageDir() {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

export function getStorage() {
  return {
    async getJSON(key) {
      try {
        await ensureStorageDir();
        const filePath = join(STORAGE_DIR, `${key}.json`);
        const data = await readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    },
    async setJSON(key, value) {
      try {
        await ensureStorageDir();
        const filePath = join(STORAGE_DIR, `${key}.json`);
        await writeFile(filePath, JSON.stringify(value), 'utf8');
        return true;
      } catch (e) {
        console.error('Storage write error:', e);
        return false;
      }
    },
    async delete(key) {
      try {
        await ensureStorageDir();
        const filePath = join(STORAGE_DIR, `${key}.json`);
        await writeFile(filePath, '', 'utf8'); // Clear the file
        return true;
      } catch (e) {
        return false;
      }
    }
  };
}
