import { getStore } from '@netlify/blobs';

const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715';

export const handler = async (event: any) => {
  console.log('Starting update-leaderboard-data function...');
  try {
    // Use Alchemy API to fetch recent BM events (last ~2 hours = 600 blocks)
    const alchemyUrl = 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    // Get current block
    const currentBlockResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
    });
    const currentBlockData = await currentBlockResponse.json();
    const currentBlock = BigInt(currentBlockData.result);
    const fromBlock = '0x' + (currentBlock - BigInt(600)).toString(16); // Last 600 blocks
    const toBlock = '0x' + currentBlock.toString(16);
    
    console.log(`Fetching BM events from block ${fromBlock} to ${toBlock}...`);
    
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [{
          address: bmContractAddress,
          topics: ['0x92c259cac325cc3ab274625712152620f8924d3dd0d2e8a8739859cdd609519c'],
          fromBlock,
          toBlock
        }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Alchemy error:', data.error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: String(data.error) }),
      };
    }

    const events = data.result || [];
    console.log(`Found ${events.length} BM events`);

    // Get existing leaderboard from Blobs
    let existingCounts = new Map<string, number>();
    
    try {
      const store = getStore({ 
        name: 'leaderboard',
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      });
      
      const existing = await store.get('counts', { type: 'json' });
      if (existing && Array.isArray(existing)) {
        existing.forEach((entry: any) => {
          existingCounts.set(entry.address.toLowerCase(), entry.count);
        });
      }
    } catch (error) {
      console.log('No existing leaderboard data found, starting fresh:', error);
      // Continue without existing data
    }
    
    // Update counts with new events
    for (const event of events) {
      if (event.topics && event.topics.length > 1) {
        const topic = event.topics[1];
        const userAddress = '0x' + topic.slice(26);
        const lowerAddress = userAddress.toLowerCase();
        existingCounts.set(lowerAddress, (existingCounts.get(lowerAddress) || 0) + 1);
      }
    }

    // Convert to sorted array
    const entries = Array.from(existingCounts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count);

    // Store in Netlify Blobs
    try {
      const store = getStore({ 
        name: 'leaderboard',
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      });
      await store.set('counts', JSON.stringify(Array.from(existingCounts.entries()).map(([address, count]) => ({ address, count }))));
      await store.set('lastUpdate', new Date().toISOString());
    } catch (error) {
      console.error('Error storing in Blobs:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to store in Blobs', details: String(error) }),
      };
    }

    console.log(`Updated leaderboard with ${entries.length} users`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        userCount: entries.length,
        topUsers: entries.slice(0, 10),
        allEntries: entries
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

