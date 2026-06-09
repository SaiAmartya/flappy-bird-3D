import crypto from 'node:crypto';
import { list, put } from '@vercel/blob';

const LB_PATH = 'leaderboard/top.json';
const MAX_KEEP = 100;
const TOP_N = 10;
// Forward speed caps at 22 u/s with gates every 16 u — nobody can
// pass gates faster than that, no matter how well they fly.
const MAX_GATES_PER_SECOND = 22 / 16;
const MIN_FLIGHT_MS = 4000; // first gate is ~4.4s out
const MAX_TOKEN_AGE_MS = 6 * 3600 * 1000;
const NAME_STRIP = /[^\w \-.!']/g;

function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [tsStr, nonce, sig] = parts;
  if (!/^[0-9]{10,16}$/.test(tsStr) || !/^[0-9a-f]{32}$/.test(nonce)) return null;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${tsStr}.${nonce}`)
    .digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return { ts: Number(tsStr), nonce };
}

async function readBoard() {
  try {
    const { blobs } = await list({ prefix: LB_PATH, limit: 1 });
    if (!blobs.length) return [];
    // cache-busting query param skips the CDN so we always read fresh
    const r = await fetch(`${blobs[0].url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const board = await readBoard();
    res.setHeader('cache-control', 's-maxage=5, stale-while-revalidate=30');
    return res.status(200).json({ scores: board.slice(0, TOP_N) });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = process.env.SCORE_SECRET;
  if (!secret) return res.status(500).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'bad_request' });
  }

  const auth = verifyToken(body.token, secret);
  if (!auth) return res.status(401).json({ error: 'invalid_token' });

  const ageMs = Date.now() - auth.ts;
  if (ageMs > MAX_TOKEN_AGE_MS || ageMs < 0) {
    return res.status(401).json({ error: 'expired_token' });
  }
  if (ageMs < MIN_FLIGHT_MS) {
    return res.status(422).json({ error: 'implausible_flight' });
  }

  const score = body.score;
  if (!Number.isInteger(score) || score < 1 || score > 5000) {
    return res.status(422).json({ error: 'invalid_score' });
  }
  const maxPossible = Math.floor((ageMs / 1000) * MAX_GATES_PER_SECOND) + 2;
  if (score > maxPossible) {
    return res.status(422).json({ error: 'implausible_flight' });
  }

  const name = String(body.name ?? '').replace(NAME_STRIP, '').trim().slice(0, 16);
  if (name.length < 2) return res.status(422).json({ error: 'invalid_name' });

  // replay protection: each token is good for exactly one submission.
  // put() without allowOverwrite throws if the nonce blob already exists.
  try {
    await put(`nonces/${auth.nonce}`, '1', { access: 'public', addRandomSuffix: false });
  } catch {
    return res.status(409).json({ error: 'already_submitted' });
  }

  const board = await readBoard();
  const entry = { name, score, ts: Date.now() };
  board.push(entry);
  board.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const trimmed = board.slice(0, MAX_KEEP);
  await put(LB_PATH, JSON.stringify(trimmed), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: 'application/json',
  });

  const rank = trimmed.indexOf(entry) + 1;
  return res.status(200).json({
    ok: true,
    rank: rank || null,
    scores: trimmed.slice(0, TOP_N),
  });
}
