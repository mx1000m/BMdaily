import { getStore } from '@netlify/blobs';

const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715';

export const handler = async (event: any) => {
  console.log('Starting populate-leaderboard function...');
  try {
    // Use Alchemy API to fetch recent BM events
    const alchemyUrl = 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    // Get current block
    const currentBlockResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
    });
    const currentBlockData = await currentBlockResponse.json();
    const currentBlock = BigInt(currentBlockData.result);
    const fromBlock = '0x' + (currentBlock - BigInt(1000)).toString(16); // Last 1000 blocks
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

    // Count BM's by address
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.topics && event.topics.length > 1) {
        const topic = event.topics[1];
        const userAddress = '0x' + topic.slice(26);
        const lowerAddress = userAddress.toLowerCase();
        counts.set(lowerAddress, (counts.get(lowerAddress) || 0) + 1);
      }
    }

    // Convert to array and sort
    const entries = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count);

    // Store in Netlify Blobs
    const store = getStore({ 
      name: 'leaderboard',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });
    await store.set('counts', JSON.stringify(entries));
    await store.set('lastUpdate', new Date().toISOString());

    console.log(`Populated leaderboard with ${entries.length} users`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        userCount: entries.length,
        topUsers: entries.slice(0, 10),
        timestamp: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Populate error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};

