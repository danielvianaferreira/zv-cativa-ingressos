/**
 * api/jogos.js — Handler da planilha Google Sheets
 * Usado pelo server.js (interface Node.js http: req, res)
 */
const { google } = require('googleapis');

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID || '122w52Arr_6watWpFyf4WsMXWa1Cy9WBEQp7sTMEj3ik';
const MARKUP = parseFloat(process.env.MARKUP || '1.40');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Auth ──────────────────────────────────────────────────────────
function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      throw new Error('GOOGLE_CREDENTIALS_JSON inválido — verifique o JSON nas variáveis de ambiente.');
    }
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }
  // Local: arquivo de credenciais
  const keyFile = process.env.GOOGLE_CREDENTIALS_PATH || './google_credentials.json';
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function parsePrice(raw) {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function applyMarkup(cost) {
  if (cost === null) return null;
  return Math.ceil(cost * MARKUP);
}

// ── Handler (Node.js HTTP interface) ─────────────────────────────
module.exports = async function jogosHandler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end('');
    return;
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      // A=Tipo B=Evento C=Data D=Competição E=Disp F=Vendidos
      // G=Ingresso H=Obs I=Ingresso+Club J=Transfer+Ingresso K=Transfer+Ingresso+Club
      range: 'Página1!A1:K200',
    });

    const rows = response.data.values || [];

    const jogos = rows
      .slice(1)
      .map((row, idx) => {
        const evento      = (row[1] || '').trim();
        const data        = (row[2] || '').trim();
        const competicao  = (row[3] || '').trim();
        const dispStr     = (row[4] || '').trim();
        const vendidosStr = (row[5] || '').trim();
        const obs         = (row[7] || '').trim();

        const precoIngresso     = applyMarkup(parsePrice(row[6]  || ''));
        const precoClub         = applyMarkup(parsePrice(row[8]  || ''));
        const precoTransfer     = applyMarkup(parsePrice(row[9]  || ''));
        const precoTransferClub = applyMarkup(parsePrice(row[10] || ''));

        const disponiveis = dispStr !== '' ? parseInt(dispStr, 10) : null;
        const vendidos    = vendidosStr !== '' ? parseInt(vendidosStr, 10) : 0;
        const estoque     = disponiveis !== null ? disponiveis - (vendidos || 0) : null;

        return {
          id: idx + 1,
          evento,
          data,
          competicao,
          estoque,
          obs,
          precos: {
            ingresso:     precoIngresso,
            club:         precoClub,
            transfer:     precoTransfer,
            transferClub: precoTransferClub,
          },
        };
      })
      .filter((j) => {
        if (!j.evento) return false;
        return Object.values(j.precos).some(p => p !== null);
      });

    res.writeHead(200, {
      ...CORS_HEADERS,
      'Cache-Control': 'max-age=120',
    });
    res.end(JSON.stringify({ jogos }));
  } catch (err) {
    console.error('[jogos] erro:', err.message);
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Erro ao carregar dados da planilha.' }));
  }
};
