import { getStorage } from './simple-storage.js';

// Saves nextAt for a fid so the cron can pick it up later
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const fid = body?.fid;
    const nextAt = body?.nextAt; // ms epoch
    if (typeof fid !== 'number' || typeof nextAt !== 'number') {
      return { statusCode: 400, body: 'Missing fid/nextAt' };
    }
    const store = getStorage();
    // Store the first notification time and mark it as not sent yet
    await store.setJSON(`due:${fid}`, { 
      fid, 
      nextAt, 
      firstNotificationSent: false,
      reminderNotificationAt: nextAt + (24 * 60 * 60 * 1000) // 24 hours after first notification
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}



