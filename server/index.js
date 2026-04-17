import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/Ricky/Desktop/exposure/.env', override: true });
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 3001;
const SHODAN_KEY = process.env.SHODAN_API_KEY;
const HIBP_KEY = process.env.HIBP_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const GROQ_KEY = process.env.GROQ_API_KEY;
console.log('GROQ_KEY loaded:', GROQ_KEY ? `"${GROQ_KEY}" (length=${GROQ_KEY.length})` : 'no');
const groq = GROQ_KEY && GROQ_KEY !== 'your_anthropic_api_key_here'
  ? { apiKey: GROQ_KEY }
  : null;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const scanStore = new Map();

// --- Risk scoring ---

const SENSITIVE_KEYWORDS = ['admin', 'dev', 'staging', 'test', 'internal'];
const DANGEROUS_PORTS = [22, 3306, 5432, 27017, 6379];

function scoreAsset({ subdomain, ports, inBreach }) {
  const reasons = [];

  for (const kw of SENSITIVE_KEYWORDS) {
    if (subdomain.includes(kw)) {
      reasons.push(`Subdomain contains sensitive keyword "${kw}"`);
    }
  }

  const exposed = DANGEROUS_PORTS.filter((p) => ports.includes(p));
  if (exposed.length > 0) {
    reasons.push(`Exposes sensitive port(s): ${exposed.join(', ')}`);
  }

  if (inBreach) {
    reasons.push('Domain found in data breach');
  }

  if (reasons.length > 0) return { score: 'High', reasons };

  if (ports.includes(80) && !ports.includes(443)) {
    return { score: 'Medium', reasons: ['HTTP only — no HTTPS'] };
  }

  return { score: 'Low', reasons: [] };
}

// --- Scanning modules ---

async function fetchSubdomains(domain) {
  const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`crt.sh ${res.status}`);

  const data = await res.json();
  const seen = new Set();
  for (const entry of data) {
    for (const name of entry.name_value.split('\n')) {
      const clean = name.trim().toLowerCase().replace(/^\*\./, '');
      if (clean && clean.endsWith(domain) && !clean.includes('*')) seen.add(clean);
    }
  }
  return [...seen];
}

async function resolveSubdomains(subdomains) {
  const results = await Promise.allSettled(
    subdomains.map(async (sub) => ({ subdomain: sub, ips: await dns.promises.resolve4(sub) }))
  );
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}

async function shodanLookup(ips) {
  if (!SHODAN_KEY || SHODAN_KEY === 'your_shodan_api_key_here') return {};
  const results = {};
  for (const ip of ips) {
    try {
      const res = await fetch(
        `https://api.shodan.io/shodan/host/${ip}?key=${SHODAN_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      results[ip] = {
        ports: data.ports ?? [],
        hostnames: data.hostnames ?? [],
        org: data.org ?? null,
        os: data.os ?? null,
        services: (data.data ?? []).map((s) => ({
          port: s.port,
          transport: s.transport,
          product: s.product ?? null,
          version: s.version ?? null,
          banner: s.data ? s.data.slice(0, 200) : null,
        })),
      };
      await new Promise((r) => setTimeout(r, 1100));
    } catch {
      // skip
    }
  }
  return results;
}

async function hibpCheck(domain) {
  try {
    const headers = { 'User-Agent': 'ExposureIQ/1.0' };
    if (HIBP_KEY) headers['hibp-apikey'] = HIBP_KEY;
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breacheddomain/${domain}`,
      { headers, signal: AbortSignal.timeout(10000) }
    );
    if (res.status === 404) return { breachCount: 0, accounts: {} };
    if (res.status === 401) return { error: 'HIBP API key required', breachCount: null };
    if (!res.ok) return { error: `HIBP ${res.status}`, breachCount: null };
    const data = await res.json();
    return { breachCount: Object.keys(data).length, accounts: data };
  } catch (err) {
    return { error: err.message, breachCount: null };
  }
}

// --- Scan orchestration ---

async function runScan(scanId, domain) {
  const update = (patch) => scanStore.set(scanId, { ...scanStore.get(scanId), ...patch });

  try {
    update({ status: 'running' });

    const [subdomains, hibp] = await Promise.all([
      fetchSubdomains(domain).catch((err) => { update({ crtshError: err.message }); return []; }),
      hibpCheck(domain),
    ]);

    const allTargets = [...new Set([domain, ...subdomains])];
    const resolved = await resolveSubdomains(allTargets);
    const uniqueIPs = [...new Set(resolved.flatMap((r) => r.ips))];
    const shodan = await shodanLookup(uniqueIPs);

    const inBreach = (hibp.breachCount ?? 0) > 0;

    const scoredSubdomains = resolved.map((r) => {
      const ports = r.ips.flatMap((ip) => shodan[ip]?.ports ?? []);
      const shodanEntries = r.ips.flatMap((ip) => (shodan[ip] ? [{ ip, ...shodan[ip] }] : []));
      const risk = scoreAsset({ subdomain: r.subdomain, ports, inBreach });
      return { subdomain: r.subdomain, ips: r.ips, ports, shodan: shodanEntries, risk };
    });

    const riskCounts = scoredSubdomains.reduce(
      (acc, s) => { acc[s.risk.score] = (acc[s.risk.score] || 0) + 1; return acc; },
      { High: 0, Medium: 0, Low: 0 }
    );

    update({
      status: 'complete',
      completedAt: new Date().toISOString(),
      results: {
        totalSubdomains: allTargets.length,
        resolvedSubdomains: resolved.length,
        uniqueIPs,
        subdomains: scoredSubdomains,
        shodan,
        hibp,
        riskCounts,
      },
    });
  } catch (err) {
    update({ status: 'error', error: err.message });
  }
}

// --- Routes ---

app.post('/api/scan', (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  const scanId = uuidv4();
  scanStore.set(scanId, { domain, status: 'pending', createdAt: new Date().toISOString() });
  runScan(scanId, domain);
  res.json({ scanId });
});

app.get('/api/results/:scanId', (req, res) => {
  const scan = scanStore.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json({ scanId: req.params.scanId, ...scan });
});

// --- Groq helper + robust JSON extractor ---

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try { return JSON.parse(trimmed); } catch {}
  const arr = trimmed.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  const obj = trimmed.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  throw new Error('Model did not return parseable JSON');
}

async function callGroq(systemPrompt, userPayload, { maxTokens = 2048 } = {}) {
  if (!groq) throw new Error('GROQ_API_KEY not configured');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload, null, 2) },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }
  const data = await response.json();
  return extractJson(data.choices[0].message.content);
}

const SUGGEST_SYSTEM_PROMPT = `You are a cybersecurity expert. For each exposed asset given, return remediation guidance AND ready-to-apply config patches.

Return ONLY a valid JSON array — no markdown fences, no explanation — where each element is:
{
  "asset": "<subdomain>",
  "fixes": ["<plain-english step>", ...],
  "patches": [
    { "type": "nginx" | "cloudflare" | "htaccess" | "iptables", "filename": "<short suggested filename>", "content": "<the full config snippet, properly escaped>" }
  ]
}

Rules:
- "patches" must contain real, working config snippets — not pseudocode, not comments-only.
- Choose the patch types that actually fit the risks. Most web exposures need nginx + cloudflare. SSH/DB exposures need iptables. Apache stacks get htaccess. Include 1–4 patches per asset.
- Keep each "content" tight (10–40 lines). No placeholder TODOs.

EXAMPLE output for an asset missing HSTS and exposing port 22:
[
  {
    "asset": "dev.example.com",
    "fixes": [
      "Enforce HSTS with a 1-year max-age and includeSubDomains",
      "Restrict SSH (port 22) to a known admin IP allow-list"
    ],
    "patches": [
      {
        "type": "nginx",
        "filename": "dev.example.com.conf",
        "content": "server {\\n  listen 443 ssl http2;\\n  server_name dev.example.com;\\n\\n  add_header Strict-Transport-Security \\"max-age=31536000; includeSubDomains; preload\\" always;\\n  add_header X-Frame-Options \\"DENY\\" always;\\n  add_header X-Content-Type-Options \\"nosniff\\" always;\\n  add_header Referrer-Policy \\"strict-origin-when-cross-origin\\" always;\\n}"
      },
      {
        "type": "iptables",
        "filename": "ssh-allowlist.sh",
        "content": "#!/bin/bash\\niptables -A INPUT -p tcp --dport 22 -s 203.0.113.10 -j ACCEPT\\niptables -A INPUT -p tcp --dport 22 -j DROP"
      }
    ]
  }
]`;

app.post('/api/suggest', async (req, res) => {
  const { assets } = req.body;
  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'assets array required' });
  }
  try {
    const payload = assets.map((a) => ({ asset: a.subdomain, ports: a.ports, risks: a.risk.reasons }));
    const suggestions = await callGroq(SUGGEST_SYSTEM_PROMPT, payload, { maxTokens: 4096 });
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
