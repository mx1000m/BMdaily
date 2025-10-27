const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715';

// Global cache that survives between invocations
let globalLeaderboardData: any = null;

export const handler = async (event: any) => {
  console.log('Starting update-leaderboard-data function...');
  try {
    // Use Alchemy API to fetch all BM events using a pagination approach
    const alchemyUrl = 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    const allEvents: any[] = [];
    
    console.log('Fetching BM events from Alchemy in pages...');
    
    // Fetch in batches to avoid timeout
    let currentBlock = 'latest';
    const batchSize = 1000; // blocks per batch
    
    for (let i = 0; i < 30; i++) { // Max 30 batches (~30k blocks = ~13 days)
      try {
        const blockNum = BigInt(36776590 + (i * batchSize)); // Start from contract deployment
        
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
              fromBlock: '0x' + blockNum.toString(16),
              toBlock: '0x' + (blockNum + BigInt(batchSize)).toString(16)
            }]
          })
        });
        
        const data = await response.json();
        
        if (data.error || !data.result) {
          console.log(`Batch ${i} failed or no data`);
          break;
        }
        
        if (Array.isArray(data.result)) {
          allEvents.push(...data.result);
        }
        
        console.log(`Batch ${i + 1}: Found ${data.result?.length || 0} events`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Batch ${i} error:`, error);
        break;
      }
    }
    
    const data = { result: allEvents };

    console.log(`Total events found: ${data.result.length}`);

    // Process event logs - user address is in topic1
    const counts = new Map<string, number>();
    
    for (const event of data.result) {
      if (event.topics && event.topics.length > 1) {
        // Extract user address from topic1
        const topic = event.topics[1];
        const userAddress = '0x' + topic.slice(26);
        counts.set(userAddress.toLowerCase(), (counts.get(userAddress.toLowerCase()) || 0) + 1);
      }
    }

    // Convert to sorted array
    const entries = Array.from(counts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count);

    // Store in global cache
    globalLeaderboardData = entries;

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

