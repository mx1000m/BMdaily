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
      if (rec.nextAt <= now) {
        // try sending
        const details = await store.getJSON(`fid:${fid}`);
        if (details?.url && details?.token) {
          try {
            await fetch(details.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: `${fid}-${now}`,
                title: "Your next BM's ready.☕",
                body: 'Tap to BM!',
                targetUrl: process.env.URL || 'https://bmdaily.netlify.app',
                tokens: [details.token],
              }),
            });
          } catch {}
        }
        await store.delete(`due:${fid}`);
      } else {
        toKeep.push(fid);
      }
    }

    await store.setJSON(indexKey, { fids: [...new Set(toKeep)] });
    return { statusCode: 200, body: JSON.stringify({ ok: true, kept: toKeep.length }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
}




