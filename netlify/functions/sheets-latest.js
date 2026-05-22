const { google } = require('googleapis');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  // Optional API key protection
  const requiredKey = process.env.SHEETS_API_KEY;
  const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-API-KEY'])) || '';
  if (requiredKey && provided !== requiredKey) return { statusCode: 401, body: 'Unauthorized' };

  const user_id = (event.queryStringParameters && event.queryStringParameters.user_id) || '';
  if (!user_id) return { statusCode: 400, body: 'Missing user_id query param' };

  const saBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  const sheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!saBase64 || !sheetId) return { statusCode: 500, body: 'Server not configured' };

  try{
    const sa = JSON.parse(Buffer.from(saBase64, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: sa,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'nutryx_backups!A2:D'
    });

    const rows = res.data.values || [];
    let latest = null;
    for (const r of rows){
      if ((r[1] || '') !== user_id) continue;
      const created = r[2];
      if (!latest || new Date(created) > new Date(latest.created_at)){
        let payload = {};
        try{ payload = JSON.parse(r[3] || '{}'); }catch(e){}
        latest = { id: r[0], user_id: r[1], created_at: r[2], payload };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, latest }) };
  }catch(err){
    console.error('sheets-latest error', err && err.message);
    return { statusCode: 500, body: 'Fetch failed' };
  }
};
