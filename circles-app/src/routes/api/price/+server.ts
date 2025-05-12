import type { RequestHandler } from '@sveltejs/kit';
import pkg from 'pg';
import {
  DB_USER, DB_PW, DB_HOST, DB_PORT,
  DB_DATABASE, DB_SSL_MODE
} from '$env/static/private';

const { Client } = pkg;

export const GET: RequestHandler = async () => {

  const client = new Client({
    user: DB_USER,
    password: DB_PW,
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_DATABASE,
    ssl: DB_SSL_MODE === 'require'
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();

    const { rows } = await client.query<{
      timestamp: Date;
      inputtoken: string;
      outputtoken: string;
      inputamountraw: string;
      outputamountraw: string;
    }>(
      `
      SELECT
        timestamp,
        inputtoken,
        outputtoken,
        inputamountraw,
        outputamountraw
      FROM quotes
      ORDER BY timestamp DESC
      LIMIT 1
      `,
    );

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No quotes found for that pair' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('rows', rows);

    const q = rows[0];
    const inputAmt = parseFloat(q.inputamountraw ?? '0');
    const outputAmt = parseFloat(q.outputamountraw ?? '0');

    const price = outputAmt / inputAmt;

    return new Response(
      JSON.stringify({
        timestamp: q.timestamp.toISOString(),
        inputToken: q.inputtoken,
        outputToken: q.outputtoken,
        inputAmt,
        outputAmt,
        price
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in /api/price:', err);
    return new Response(
      JSON.stringify({ error: 'Could not fetch price' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    await client.end();
  }
};
