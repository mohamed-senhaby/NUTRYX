const { google } = require('googleapis');
const crypto = require('crypto');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // Simple API key protection (optional)
  const requiredKey = process.env.SHEETS_API_KEY;
  const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-API-KEY'])) || '';
  if (requiredKey && provided !== requiredKey) return { statusCode: 401, body: 'Unauthorized' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }
  const { user_id, payload } = body;
  if (!user_id || payload === undefined) return { statusCode: 400, body: 'Missing user_id or payload' };

  const saBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  const sheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!saBase64 || !sheetId) return { statusCode: 500, body: 'Server not configured' };

  try{
    const sa = JSON.parse(Buffer.from(saBase64, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: sa,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const id = (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString('hex');
    const created_at = new Date().toISOString();
    const row = [[ id, user_id, created_at, JSON.stringify(payload) ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'nutryx_backups!A:D',
      valueInputOption: 'RAW',
      requestBody: { values: row }
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, id, created_at }) };
  }catch(err){
    console.error('sheets-upload error', err && err.message);
    return { statusCode: 500, body: 'Upload failed' };
  }
};
