export async function fetchGroupsByOwner(ownerAddress: string): Promise<string[]> {
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'circles_query',
    params: [
      {
        Namespace: 'CrcV2',
        Table: 'CMGroupCreated',
        Columns: ['proxy'],
        Filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'owner',
            Value: ownerAddress.toLowerCase(),
          },
        ],
        Order: [],
        Limit: 10,
      },
    ],
  };

  try {
    const response = await fetch('https://rpc.circlesubi.network/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return data.result?.rows?.flatMap((row: string[]) => row[0]) ?? [];
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}
