import {json, type RequestHandler} from '@sveltejs/kit';
import {create} from 'kubo-rpc-client';

// Connect to your local IPFS node
const ipfs = create({
    host: 'localhost',
    port: 5001,
    protocol: 'http'
});

// POST handler to pin a JSON object to IPFS
export const POST: RequestHandler = async ({request}) => {
    try {
        const profileData = await request.json();
        const buffer = Buffer.from(JSON.stringify(profileData));
        const result = await ipfs.add(buffer);

        // Pin the JSON object
        await ipfs.pin.add(result.cid);

        return json({cid: result.cid.toString()});
    } catch (error) {
        return json({error: `Failed to pin file: ${(error as Error).message}`}, {status: 500});
    }
};

// GET handler to retrieve a pinned JSON object from IPFS using CID
export const GET: RequestHandler = async ({url}) => {
    try {
        const cid = url.searchParams.get('cid');
        if (!cid) {
            return json({error: 'CID is required'}, {status: 400});
        }

        const stream: AsyncIterable<Uint8Array> = ipfs.cat(cid);
        const data = Buffer.concat(await (async () => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return chunks;
        })()).toString('utf-8');

        return json(JSON.parse(data));
    } catch (error) {
        return json({error: `Failed to retrieve profile: ${(error as Error).message}`}, {status: 500});
    }
};
