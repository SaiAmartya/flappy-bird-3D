import crypto from 'node:crypto';

// Issues a short-lived HMAC-signed flight token. A score can only be
// submitted with a token minted before the flight began — the token's
// age is what makes a claimed score physically plausible (or not).
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const secret = process.env.SCORE_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'not_configured' });
  }
  const ts = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${ts}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ token: `${payload}.${sig}` });
}
