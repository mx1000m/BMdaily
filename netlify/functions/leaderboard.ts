import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

const bmContractAddress = '0x47EAd660725c7821c7349DF42579dBE857c02715' as `0x${string}`;

const bmAbi = [
  {
    type: 'event',
    name: 'BM',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'userCount', type: 'uint256', indexed: false },
      { name: 'totalCount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'bmCount',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

interface LeaderboardEntry {
  address: string;
  count: number;
  name?: string;
}

interface LeaderboardData {
  lastUpdate: string;
  entries: LeaderboardEntry[];
}

const DATA_FILE_PATH = '/tmp/leaderboard-data.json';

// Helper functions to read/write leaderboard data
function readLeaderboardData(): LeaderboardData {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading leaderboard data:', error);
  }
  return { lastUpdate: new Date('2024-10-15').toISOString(), entries: [] };
}

function writeLeaderboardData(data: LeaderboardData) {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing leaderboard data:', error);
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Read existing leaderboard data
    let leaderboardData = readLeaderboardData();
    const lastUpdate = new Date(leaderboardData.lastUpdate);
    const now = new Date();
    
    // Check if we need to update (update once per day)
    const needsUpdate = now.getTime() - lastUpdate.getTime() > 24 * 60 * 60 * 1000;
    
    if (!needsUpdate && leaderboardData.entries.length > 0) {
      // Return existing data if still fresh
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: leaderboardData.entries }),
      };
    }

    // Need to update - fetch recent BMs and merge with existing
    // Use Alchemy RPC endpoint for better reliability
    const alchemyUrl = process.env.ALCHEMY_BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/pBWWRwxvrlovShZdNr9M_';
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(alchemyUrl),
    });

    // Get recent BM events - but limit to 100 blocks to work with free tier
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(100); // Only last 100 blocks for free tier

    console.log(`Fetching events from block ${fromBlock} to ${currentBlock}`);

    // Fetch events in batches of 10 (Alchemy free tier limit)
    const events: any[] = [];
    const batchSize = 10;
    
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += BigInt(batchSize)) {
      const endBlock = startBlock + BigInt(batchSize - 1) > currentBlock 
        ? currentBlock 
        : startBlock + BigInt(batchSize - 1);
      
      try {
        const batchEvents = await publicClient.getLogs({
          address: bmContractAddress,
          event: bmAbi[0],
          fromBlock: startBlock,
          toBlock: endBlock,
        });
        events.push(...batchEvents);
      } catch (error) {
        console.error(`Error fetching blocks ${startBlock} to ${endBlock}:`, error);
        // Continue with other batches
      }
    }

    console.log(`Fetched ${events.length} recent BM events since last update`);

    // Build a map of existing counts
    const existingCounts = new Map<string, number>();
    leaderboardData.entries.forEach(entry => {
      existingCounts.set(entry.address.toLowerCase(), entry.count);
    });

    // Add new BM counts to existing
    for (const evt of events) {
      const addr = evt.args.user;
      if (addr) {
        const addrLower = addr.toLowerCase();
        existingCounts.set(addrLower, (existingCounts.get(addrLower) || 0) + 1);
      }
    }

    console.log(`Total unique addresses: ${existingCounts.size}`);

    // Convert to array and sort
    const allEntries: LeaderboardEntry[] = Array.from(existingCounts.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    console.log(`Returning ${allEntries.length} leaderboard entries`);

    // Update the persisted data
    leaderboardData.entries = allEntries;
    leaderboardData.lastUpdate = now.toISOString();
    writeLeaderboardData(leaderboardData);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: allEntries }),
    };
  } catch (error) {
    console.error('Leaderboard error:', error);
    
    // Return existing data even if we can't update
    const existingData = readLeaderboardData();
    if (existingData.entries.length > 0) {
      console.log('Returning existing data due to error');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: existingData.entries }),
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch leaderboard', details: String(error) }),
    };
  }
};

