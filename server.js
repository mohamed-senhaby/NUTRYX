// Minimal Node proxy for NUTRYX PWA
// - Proxies AI calls to Anthropic (server-side API key required)
// - Proxies USDA search (server-side API key required)
// Usage: set ANTHROPIC_API_KEY and USDA_API_KEY in env, then `node server.js`

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 8787;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || null;
const USDA_API_KEY = process.env.USDA_API_KEY || null;

function sendJSON(res, status, obj){
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(s);
}

async function getRequestBody(req){
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body || '{}'); } catch(e) { return null; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // CORS preflight
  if (req.method === 'OPTIONS'){
    res.writeHead(200, {
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type,Authorization'
    });
    return res.end();
  }

  if (url.pathname === '/api/ping' && req.method === 'GET'){
    return sendJSON(res,200,{ok:true, now: new Date().toISOString()});
  }

  if (url.pathname === '/api/ai' && req.method === 'POST'){
    if (!ANTHROPIC_API_KEY) return sendJSON(res,503,{error:'ANTHROPIC_API_KEY not set on server. Set environment variable.'});
    const body = await getRequestBody(req);
    if (!body) return sendJSON(res,400,{error:'invalid json'});
    const payload = {
      model: body.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      messages: [],
      max_tokens: body.max_tokens || 1200
    };
    if (body.system) payload.messages.push({ role: 'system', content: body.system });
    payload.messages.push({ role: 'user', content: body.img ? [{ type: 'image', source: { type: 'base64', media_type: body.imgType || 'image/jpeg', data: body.img } }, { type: 'text', text: body.prompt }] : body.prompt });

    try{
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANTHROPIC_API_KEY}` }, body: JSON.stringify(payload)
      });
      const j = await r.json();
      // Try to extract readable text
      let text = '';
      if (j && Array.isArray(j.content)){
        const tblock = j.content.find(c => c.type === 'text');
        text = tblock ? tblock.text : JSON.stringify(j);
      } else if (j && j.completion) text = j.completion;
      else if (j && j.message) text = j.message;
      else text = JSON.stringify(j);
      return sendJSON(res, r.ok ? 200 : 502, { text, raw: j });
    }catch(err){
      return sendJSON(res,502,{error:'AI proxy failed', detail:String(err)});
    }
  }

  if (url.pathname === '/api/usda/search' && req.method === 'POST'){
    if (!USDA_API_KEY) return sendJSON(res,503,{error:'USDA_API_KEY not set on server. Set environment variable.'});
    const body = await getRequestBody(req);
    if (!body) return sendJSON(res,400,{error:'invalid json'});
    const q = body.q || '';
    const pageSize = body.pageSize || 12;
    try{
      const apiUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(q)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy,Branded`;
      const r = await fetch(apiUrl);
      const j = await r.json();
      return sendJSON(res, r.ok ? 200 : 502, j);
    }catch(err){
      return sendJSON(res,502,{error:'USDA proxy failed', detail:String(err)});
    }
  }

  // Proxy OpenFoodFacts search to avoid CORS issues in browser
  if (url.pathname === '/api/off/search' && req.method === 'POST'){
    const body = await getRequestBody(req);
    if (!body) return sendJSON(res,400,{error:'invalid json'});
    const q = body.q || '';
    const pageSize = body.pageSize || 8;
    try{
      const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=${pageSize}&fields=product_name,brands,nutriments,serving_size,nutriscore_grade,image_front_small_url`;
      // Ensure we request JSON and present a User-Agent to avoid HTML fallbacks
      const r = await fetch(apiUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'NUTRYX-Proxy/1.0 (+https://nutryx.local)' } });
      const contentType = r.headers.get('content-type') || '';
      if (!contentType.includes('application/json')){
        const txt = await r.text();
        return sendJSON(res,502,{error:'OFF proxy failed', detail:'non-json response', status:r.status, snippet: txt.slice(0,200)});
      }
      const j = await r.json();
      return sendJSON(res, r.ok ? 200 : 502, j);
    }catch(err){
      return sendJSON(res,502,{error:'OFF proxy failed', detail:String(err)});
    }
  }

  sendJSON(res,404,{error:'not_found',path:url.pathname});
});

server.listen(PORT, ()=>console.log(`NUTRYX proxy listening on http://localhost:${PORT}`));
