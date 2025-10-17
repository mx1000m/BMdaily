// Scheduled function: runs every 5 minutes
// netlify.toml will define the schedule
import { getStorage } from './simple-storage.js';

export async function handler() {
  try {
    const store = getStorage();
    // Netlify Blobs does not expose list via SDK on free tier; keep a rolling index of fids
    // For simplicity, store a set of keys under a single index document
    const indexKey = 'due:index';
    const index = (await store.getJSON(indexKey)) || { fids: [] };
    const now = Date.now();
    const toKeep = [];

    for (const fid of index.fids) {
      const rec = await store.getJSON(`due:${fid}`);
      if (!rec || typeof rec.nextAt !== 'number') continue;
      
      // Check if it's time for first notification
      if (rec.nextAt <= now && !rec.firstNotificationSent) {
        const details = await store.getJSON(`fid:${fid}`);
        if (details?.url && details?.token) {
          try {
            await fetch(details.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: `${fid}-${now}`,
                title: "Your next BM is ready!",
                body: 'Tap to BM!',
                targetUrl: process.env.URL || 'https://bmdaily.netlify.app',
                tokens: [details.token],
              }),
            });
            // Mark first notification as sent
            await store.setJSON(`due:${fid}`, { ...rec, firstNotificationSent: true });
          } catch {}
        }
        toKeep.push(fid); // Keep for reminder notification
      }
      // Check if it's time for reminder notification (24 hours after first notification)
      else if (rec.reminderNotificationAt && rec.reminderNotificationAt <= now && rec.firstNotificationSent) {
        const details = await store.getJSON(`fid:${fid}`);
        if (details?.url && details?.token) {
          try {
            await fetch(details.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: `${fid}-reminder-${now}`,
                title: "Your next BM is ready!",
                body: "Don't forget to boost your daily TXs on Base.",
                targetUrl: process.env.URL || 'https://bmdaily.netlify.app',
                tokens: [details.token],
              }),
            });
          } catch {}
        }
        await store.delete(`due:${fid}`); // Remove after reminder
      }
      // Keep if not time yet
      else if (rec.nextAt > now || (rec.reminderNotificationAt && rec.reminderNotificationAt > now)) {
        toKeep.push(fid);
      }
    }

    await store.setJSON(indexKey, { fids: [...new Set(toKeep)] });
    return { statusCode: 200, body: JSON.stringify({ ok: true, kept: toKeep.length }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}




