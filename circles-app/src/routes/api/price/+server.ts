import type { RequestHandler } from '@sveltejs/kit';
import pkg from 'pg';
import {
  DB_USER, DB_PW, DB_HOST, DB_PORT,
  DB_DATABASE
} from '$env/static/private';
import { CirclesConverter } from '@circles-sdk/utils';
const { Client } = pkg;

export const GET: RequestHandler = async ({ url }) => {
  const groupToken = url.searchParams.get('group')?.toLowerCase();
  const xdai = '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d'
  let resolution = url.searchParams.get('resolution') ?? 'hour';
  let period = url.searchParams.get('period') ?? '7 days';

  const validRes = new Set(['hour', 'day']);
  const validPer = new Set(['7 days', '30 days']);
  if (!groupToken || !xdai || !validRes.has(resolution) || !validPer.has(period)) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const sql = `
  SELECT
    date_trunc('${resolution}', timestamp) AS bucket,
    avg(
      CASE
        WHEN inputtoken = $1 AND outputtoken = $2 THEN (outputamountraw::double precision) / (inputamountraw::double precision)
        WHEN inputtoken = $2 AND outputtoken = $1 THEN (inputamountraw::double precision) / (outputamountraw::double precision)
        ELSE NULL
      END
    ) AS price
  FROM quotes
  WHERE
    (
      (inputtoken = $1 AND outputtoken = $2)
      OR
      (inputtoken = $2 AND outputtoken = $1)
    )
    AND timestamp >= now() - interval '${period}'
  GROUP BY bucket
  ORDER BY bucket
`;

  const client = new Client({
    user: DB_USER,
    password: DB_PW,
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_DATABASE,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5_000
  });

  try {
    await client.connect();
    const { rows } = await client.query<{ bucket: Date; price: string }>(
      sql,
      [groupToken, xdai]
    );

    const history = rows.map(r => ({
      timestamp: new Date(r.bucket),
      price: CirclesConverter.attoStaticCirclesToAttoCircles(CirclesConverter.circlesToAttoCircles(parseFloat(r.price)))
    }));

    return new Response(JSON.stringify(history), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    client.end();
  }
};
