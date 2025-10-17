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
		const store = getStore({ name: 'notifications' });
		const tokensList = await store.list({ prefix: 'token-' });
		const items = [];
		for (const { key } of tokensList.blobs) {
			const fid = key.replace('token-', '');
			const details = await store.getJSON(key);
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
		return { statusCode: 500, body: 'Internal Server Error' };
	}
};


