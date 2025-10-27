import { getStore } from '@netlify/blobs';

const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715';

export const handler = async (event: any) => {
  try {
    // Fetch ALL transactions from contract (no block range limit with Basescan)
    const apiUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${bmContractAddress}&startblock=0&endblock=99999999&sort=asc`;
    
    console.log('Fetching all transactions from Basescan...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`API Status: ${data.status}, Result length: ${data.result?.length || 0}`);
    
    if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'No data available yet',
          status: data.status,
          debug: data
        }),
      };
    }

    // Process transactions - filter only BM calls and aggregate by user
    const counts = new Map<string, number>();
    
    for (const tx of data.result) {
      // BM transactions have specific method signature in the 'input' field
      // if input is just 0x (no parameters), it's a simple BM call
      if (tx.input === '0x' || tx.input.startsWith('0x92c259')) {
        const user = tx.from?.toLowerCase();
        if (user) {
          counts.set(user, (counts.get(user) || 0) + 1);
        }
      }
    }

    // Convert to sorted array
    const entries = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count);

    // Store in Netlify Blobs
    const store = getStore({ name: 'leaderboard' });
    await store.set('entries', JSON.stringify(entries));
    await store.set('lastUpdate', new Date().toISOString());

    console.log(`Updated leaderboard with ${entries.length} users`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        userCount: entries.length,
        topUsers: entries.slice(0, 10)
      }),
    };
  } catch (error) {
    console.error('Update error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};

