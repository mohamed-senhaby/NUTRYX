// Client helper to call the serverless Sheets functions
export async function sheetsUpload(payload, userId){
  const res = await fetch('/.netlify/functions/sheets-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_SHEETS_API_KEY || ''
    },
    body: JSON.stringify({ user_id: userId, payload })
  });
  return res.json();
}

export async function sheetsFetchLatest(userId){
  const url = `/.netlify/functions/sheets-latest?user_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers: { 'x-api-key': import.meta.env.VITE_SHEETS_API_KEY || '' } });
  return res.json();
}

export default { sheetsUpload, sheetsFetchLatest };
