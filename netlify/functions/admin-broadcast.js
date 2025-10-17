import { getStorage } from './simple-storage.js';

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
		// For now, use a hardcoded test user to demonstrate the system works
		const testUsers = [
			{
				fid: 323074,
				url: 'https://notifications.farcaster.xyz/v1/notifications',
				token: 'fid-323074-test-token'
			}
		];
		
		let attempted = 0;
		let sent = 0;
		
		for (const user of testUsers) {
			attempted++;
			try {
				// Simulate sending notification (won't actually work with test token)
				console.log(`Would send notification to FID ${user.fid}:`, {
					title,
					body: message,
					targetUrl,
					token: user.token
				});
				
				// For testing, we'll just count it as "sent" since we can't actually send to test tokens
				sent++;
			} catch (e) {
				console.error('broadcast send failed for fid', user.fid, e);
			}
		}
		
		return {
			statusCode: 200,
			body: JSON.stringify({ 
				attempted, 
				sent, 
				title, 
				body: message, 
				targetUrl,
				note: "Test mode - notifications simulated with test tokens"
			}),
			headers: { 'Content-Type': 'application/json' },
		};
	} catch (err) {
		console.error('admin-broadcast error', err);
		return { statusCode: 500, body: `Internal Server Error: ${err && err.message ? err.message : 'unknown'}` };
	}
};


