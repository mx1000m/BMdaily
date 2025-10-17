import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
	if (event.httpMethod !== 'POST') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	const adminSecret = process.env.ADMIN_SECRET;
	const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
	if (!adminSecret || provided !== adminSecret) {
		return { statusCode: 401, body: 'Unauthorized' };
	}

	let body;
	try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
	const title = body.title || "Your next BM's ready.☕";
	const message = body.body || 'Tap to BM!';
	const targetUrl = body.targetUrl || process.env.VITE_BASE_URL || 'https://bmdaily.netlify.app';

	try {
		const store = getStore({ name: 'notifications' });
		const tokensList = await store.list({ prefix: 'token-' });
		let attempted = 0;
		let sent = 0;
		for (const { key } of tokensList.blobs) {
			const fid = key.replace('token-', '');
			const details = await store.getJSON(key);
			if (!details || !details.url || !details.token) continue;
			attempted++;
			try {
				const resp = await fetch(details.url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						notificationId: crypto.randomUUID(),
						title,
						body: message,
						targetUrl,
						tokens: [details.token],
					}),
				});
				if (resp.ok) sent++;
			} catch (e) {
				console.error('broadcast send failed for fid', fid, e);
			}
		}
		return {
			statusCode: 200,
			body: JSON.stringify({ attempted, sent, title, body: message, targetUrl }),
			headers: { 'Content-Type': 'application/json' },
		};
	} catch (err) {
		console.error('admin-broadcast error', err);
		return { statusCode: 500, body: `Internal Server Error: ${err && err.message ? err.message : 'unknown'}` };
	}
};


