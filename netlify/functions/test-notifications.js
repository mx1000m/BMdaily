// Test function to manually register and test notifications
import { getStorage } from './simple-storage.js';

export const handler = async (event) => {
  if (event.httpMethod === 'POST') {
    // Register a test user
    try {
      const store = getStorage();
      const fid = 323074;
      const testData = {
        url: 'https://notifications.farcaster.xyz/v1/notifications',
        token: 'fid-323074-test-token',
        updatedAt: new Date().toISOString(),
      };
      
      await store.setJSON(`fid:${fid}`, testData);
      
      // Add to index
      const indexKey = 'due:index';
      const index = (await store.getJSON(indexKey)) || { fids: [] };
      if (!index.fids.includes(fid)) {
        index.fids.push(fid);
        await store.setJSON(indexKey, index);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, registered: true, fid }),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
    }
  } else if (event.httpMethod === 'GET') {
    // List registrations
    try {
      const store = getStorage();
      const indexKey = 'due:index';
      const index = (await store.getJSON(indexKey)) || { fids: [] };
      const items = [];
      
      for (const fid of index.fids) {
        const details = await store.getJSON(`fid:${fid}`);
        if (details && details.token && details.url) {
          let host;
          try { host = new URL(details.url).host; } catch { host = undefined; }
          items.push({ fid: Number(fid), urlHost: host });
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ count: items.length, registrations: items }),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
    }
  } else {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
};

