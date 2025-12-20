/**
 * Cloudflare Worker: GA4 stats endpoint for GitHub Pages
 *
 * Deploy:
 * 1) Create a Worker, paste this file.
 * 2) Set secrets (Workers -> Settings -> Variables):
 *    - GA_SERVICE_ACCOUNT_JSON (the entire service account JSON string)
 *    - GA_PROPERTY_ID (e.g. 516558878)
 * 3) (Optional) Set ALLOWED_ORIGIN to your site domain (or leave empty for '*')
 *
 * Endpoint:
 *   GET /stats?range=today|7d|30d
 *
 * Response:
 *   { range, rangeLabel, totals:{activeUsers,sessions,screenPageViews}, topPages:[{path,views}] }
 */

function b64url(bytes) {
  const s = btoa(String.fromCharCode.apply(null, bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function utf8(str) {
  return new TextEncoder().encode(str);
}

function pemToDer(pem) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function signJwtRS256(privateKeyPem, unsigned) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, utf8(unsigned));
  return b64url(new Uint8Array(sig));
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(utf8(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64url(
    utf8(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      })
    )
  );
  const unsigned = header + '.' + claim;
  const signature = await signJwtRS256(sa.private_key, unsigned);
  const assertion = unsigned + '.' + signature;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=' +
      encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' +
      encodeURIComponent(assertion)
  });

  if (!res.ok) throw new Error('token HTTP ' + res.status);
  const data = await res.json();
  if (!data.access_token) throw new Error('no access_token');
  return data.access_token;
}

function rangeToDates(range) {
  const r = String(range || '7d').toLowerCase();
  if (r === 'today') return { startDate: 'today', endDate: 'today', label: 'Dzisiaj' };
  if (r === '30d') return { startDate: '30daysAgo', endDate: 'today', label: 'Ostatnie 30 dni' };
  return { startDate: '7daysAgo', endDate: 'today', label: 'Ostatnie 7 dni' };
}

async function runReport(token, propertyId, range) {
  const { startDate, endDate, label } = rangeToDates(range);

  const body = {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    // top pages by views
    dimensions: [{ name: 'pagePath' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) throw new Error('report HTTP ' + res.status);
  const data = await res.json();

  const totals = {};
  const metricHeaders = (data.metricHeaders || []).map((h) => h.name);
  const totalVals = data.totals && data.totals[0] ? data.totals[0].metricValues || [] : [];
  metricHeaders.forEach((name, idx) => {
    totals[name] = totalVals[idx] ? Number(totalVals[idx].value || 0) : 0;
  });

  const topPages = (data.rows || []).map((row) => {
    const path = row.dimensionValues && row.dimensionValues[0] ? row.dimensionValues[0].value : '';
    const views =
      row.metricValues && row.metricValues[2] ? Number(row.metricValues[2].value || 0) : 0;
    return { path, views };
  });

  return { range: String(range || '7d'), rangeLabel: label, totals, topPages };
}

function corsHeaders(origin) {
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response('', { headers: corsHeaders(origin) });
    }

    if (url.pathname !== '/stats') {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
    }

    try {
      const saRaw = env.GA_SERVICE_ACCOUNT_JSON;
      const propertyId = env.GA_PROPERTY_ID;
      if (!saRaw || !propertyId) {
        return new Response(
          JSON.stringify({ error: 'Missing GA_SERVICE_ACCOUNT_JSON or GA_PROPERTY_ID' }),
          { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
        );
      }

      const sa = JSON.parse(saRaw);
      const range = url.searchParams.get('range') || '7d';

      const token = await getAccessToken(sa);
      const out = await runReport(token, propertyId, range);

      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e && e.message ? e.message : e) }),
        { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }
  }
};
