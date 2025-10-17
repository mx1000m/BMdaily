import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
	if (event.httpMethod !== 'GET') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	const adminSecret = process.env.ADMIN_SECRET;
	const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
	if (!adminSecret || provided !== adminSecret) {
		return { statusCode: 401, body: 'Unauthorized' };
	}

	try {
		const store = getStore({ name: 'bm-notifications', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN });
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
		console.error('admin-list-registrations error', err);
		return { statusCode: 500, body: `Internal Server Error: ${err && err.message ? err.message : 'unknown'}` };
	}
};


