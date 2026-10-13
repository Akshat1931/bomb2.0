/**
 * /api/imgproxy?url=<encoded-image-url>
 * Server-side image proxy — bypasses browser CORS for Discord CDN images.
 * Vercel runs this on the server, so it is not subject to CORS restrictions.
 */
export default async function handler(req, res) {
  // CORS headers so the browser can receive the proxied response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow image URLs (basic safety check)
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Restrict to known image hosts (Discord CDN, etc.)
  const allowedHosts = [
    'cdn.discordapp.com',
    'media.discordapp.net',
    'images-ext-1.discordapp.net',
    'images-ext-2.discordapp.net',
    'discordapp.com',
    'discordapp.net',
    'discord.com',
    'cdn.discord.com',
    'attachments.discord.net',
    'i.imgur.com',
    'imgur.com',
    'pbs.twimg.com',
    'media.tenor.com',
  ];
  if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
    return res.status(403).json({ error: 'Host not allowed' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://discord.com/',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('imgproxy error:', err);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}
