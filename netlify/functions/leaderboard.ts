const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715';

interface LeaderboardEntry {
  address: string;
  count: number;
  name?: string;
}

// Cache to avoid repeated API calls
let cachedData: LeaderboardEntry[] = [];
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Check cache
    if (Date.now() - cacheTime < CACHE_TTL && cachedData.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: cachedData }),
      };
    }

    // Fetch BM events using Etherscan-compatible API
    // Using public RPC with eth_getLogs
    const apiUrl = 'https://mainnet.base.org';
    
    console.log('Fetching BM events from Base RPC...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [{
          address: bmContractAddress,
          topics: ['0x92c259cac325cc3ab274625712152620f8924d3dd0d2e8a8739859cdd609519c'],
          fromBlock: '0x2315c26', // Block 36776590 (contract deployment)
          toBlock: 'latest'
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message || 'Unknown error'}`);
    }

    const events = Array.isArray(data.result) ? data.result : [];
    console.log(`Found ${events.length} BM events`);

    // Aggregate counts from event logs
    // In the BM event, the user address is in topic1 (indexed parameter)
    const counts = new Map<string, number>();
    
    for (const event of events) {
      // User address is in topic1 (indexed parameter)
      if (event.topics && event.topics.length > 1) {
        // Extract address from topic1 (it's padded with zeros)
        const topic = event.topics[1];
        const userAddress = '0x' + topic.slice(26); // Remove the 0x prefix and topic hash, keep the address
        counts.set(userAddress.toLowerCase(), (counts.get(userAddress.toLowerCase()) || 0) + 1);
      }
    }

    const entries: LeaderboardEntry[] = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`Top 10 users: ${entries.length} entries`);

    // Update cache
    cachedData = entries;
    cacheTime = Date.now();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return cached data if available
    if (cachedData.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: cachedData }),
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch leaderboard', details: String(error) }),
    };
  }
};
