export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const fen = req.query.fen || (req.body && req.body.fen);
  if (!fen) {
    return res.status(400).json({ error: 'Missing fen parameter' });
  }

  // 1. Try stockfish.online from server side
  try {
    const onlineUrl = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=13`;
    const response = await fetch(onlineUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.bestmove) {
        return res.status(200).json(data);
      }
    }
  } catch (e) {
    console.warn('stockfish.online server-side proxy failed:', e);
  }

  // 2. Fallback to chess-api.com
  try {
    const chessApiRes = await fetch('https://chess-api.com/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({ fen, depth: 12 })
    });
    if (chessApiRes.ok) {
      const chessData = await chessApiRes.json();
      return res.status(200).json({
        success: true,
        bestmove: `bestmove ${chessData.from}${chessData.to}`,
        evaluation: chessData.eval,
        san: chessData.san,
        from: chessData.from,
        to: chessData.to,
        isCapture: chessData.isCapture
      });
    }
  } catch (e2) {
    console.warn('chess-api.com server-side failed:', e2);
  }

  return res.status(500).json({ error: 'Failed to calculate best move' });
}
