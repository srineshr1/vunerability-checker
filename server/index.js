import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/anilk/OneDrive/Documents/Desktop/HK2/vunerability-checker/.env' });
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dns from 'dns';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// --- MongoDB Connection ---
if (!MONGODB_URI) {
  console.error('MONGO_URI is not defined in .env! Database connection will fail.');
} else {
  const redactedUri = MONGODB_URI.replace(/\/\/.*@/, '//****:****@');
  console.log('Attempting to connect to MongoDB:', redactedUri);
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// --- Schemas ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, trim: true },
  password: { type: String }, // Hashed
  avatar: { type: String },
  googleId: { type: String },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const scanSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  userEmail: { type: String }, // Links to the user who ran the scan
  status: { type: String, enum: ['pending', 'running', 'complete', 'error'], default: 'pending' },
  error: { type: String },
  results: { type: mongoose.Schema.Types.Mixed }, // Stores the full scan results object
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

const Scan = mongoose.model('Scan', scanSchema);

const scanStore = new Map();
// Removed in-memory users Map

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
//--- login---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const sanitizedName = String(name || '').trim();
  const sanitizedPassword = String(password || '');

  if (!isValidEmail(normalizedEmail) || !sanitizedPassword) {
    return res.status(400).json({ error: 'Valid email and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Account already exists. Please sign in.' });
    }

    const user = new User({
      email: normalizedEmail,
      name: sanitizedName,
      password: hashPassword(sanitizedPassword),
      provider: 'local'
    });

    await user.save();

    res.json({
      message: 'Account created successfully.',
      user: { email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.provider !== 'local' || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({
      message: 'Signed in successfully.',
      user: { email: user.email, name: user.name, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential (ID token) is required.' });
  }

  if (!googleClient) {
    return res.status(500).json({ error: 'Google Auth is not configured on the server.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    const normalizedEmail = email.toLowerCase().trim();

    // Create or update user in MongoDB
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        name: name || '',
        avatar: picture || '',
        googleId,
        provider: 'google'
      });
      await user.save();
    } else if (user.provider !== 'google') {
      user.googleId = googleId;
      user.provider = 'google';
      user.avatar = picture || user.avatar;
      await user.save();
    }

    res.json({
      message: 'Google sign-in successful.',
      user: { email: user.email, name: user.name, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Google verification error:', err);
    res.status(401).json({ error: 'Invalid Google token.' });
  }
});

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

    const scanResult = {
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
    };

    update(scanResult);

    // Update MongoDB record if possible
    const currentScan = scanStore.get(scanId);
    if (currentScan?.userEmail) {
      try {
        await Scan.findOneAndUpdate(
          { domain: currentScan.domain, userEmail: currentScan.userEmail, status: 'pending' },
          {
            status: 'complete',
            completedAt: new Date(),
            results: scanResult.results
          },
          { sort: { createdAt: -1 } }
        );
      } catch (err) {
        console.error('Failed to update scan in database:', err);
      }
    }
  } catch (err) {
    update({ status: 'error', error: err.message });
  }
}

// --- Routes ---

app.post('/api/scan', async (req, res) => {
  const { domain, userEmail } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  const scanId = uuidv4();
  const scanData = {
    domain,
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail
  };

  scanStore.set(scanId, scanData);

  // If user is logged in, create a record in MongoDB as well
  if (userEmail) {
    try {
      const dbScan = new Scan({
        domain,
        userEmail,
        status: 'pending',
        createdAt: new Date()
      });
      await dbScan.save();
      // We can use the MongoDB _id as the scanId if we want, but keeping uuid for now
      // for compatibility with scanStore. Migration to full DB is recommended.
    } catch (err) {
      console.error('Failed to save scan to database:', err);
    }
  }

  runScan(scanId, domain);
  res.json({ scanId });
});

app.get('/api/history/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const scans = await Scan.find({ userEmail: email }).sort({ createdAt: -1 }).limit(20);
    res.json(scans.map(s => ({
      scanId: s._id,
      domain: s.domain,
      status: s.status,
      createdAt: s.createdAt,
      results: s.results
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/results/:scanId', (req, res) => {
  const scan = scanStore.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json({ scanId: req.params.scanId, ...scan });
});

// --- Groq helper + robust JSON extractor ---

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try { return JSON.parse(trimmed); } catch { }
  const arr = trimmed.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch { } }
  const obj = trimmed.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch { } }
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

const KILLCHAIN_SYSTEM_PROMPT = `You are a red-team operator. Given a target's exposed assets and breach data, write a realistic, ordered attack chain.

Return ONLY a valid JSON array — no markdown fences, no explanation. Each element is:
{
  "step": <1-based integer>,
  "phase": "Recon" | "Initial Access" | "Lateral Movement" | "Privilege Escalation" | "Impact",
  "action": "<imperative verb phrase, e.g., 'Brute-force SSH on dev.x.com'>",
  "target": "<the specific asset, IP, or service>",
  "rationale": "<one sentence: why this step is plausible given the input>",
  "findings_used": ["<exact subdomain or breach email from input>", ...],
  "severity": "low" | "med" | "high"
}

Rules:
- Output 4–6 steps. Chain them — each step builds on the previous.
- Be CONCRETE. Reference specific subdomains, ports, and breach accounts from the input. Do not invent assets.
- "findings_used" must contain exact strings (subdomain names or email addresses) that appear in the input.
- Severity: 'high' for steps that achieve access or impact; 'med' for movement; 'low' for recon.
- Do not include defensive advice or disclaimers — this is a simulation report for the defender.`;

app.post('/api/killchain/:scanId', async (req, res) => {
  const scan = scanStore.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  if (scan.status !== 'complete') return res.status(409).json({ error: 'Scan not complete' });

  try {
    const r = scan.results ?? {};
    const highRisk = (r.subdomains ?? [])
      .filter((s) => s.risk?.score === 'High')
      .slice(0, 8)
      .map((s) => ({ subdomain: s.subdomain, ports: s.ports, reasons: s.risk?.reasons ?? [] }));
    const mediumRisk = (r.subdomains ?? [])
      .filter((s) => s.risk?.score === 'Medium')
      .slice(0, 4)
      .map((s) => ({ subdomain: s.subdomain, ports: s.ports }));
    const breachAccounts = r.hibp?.accounts ? Object.keys(r.hibp.accounts).slice(0, 6) : [];

    const payload = {
      domain: scan.domain,
      breachCount: r.hibp?.breachCount ?? 0,
      breachAccounts,
      highRisk,
      mediumRisk,
    };

    const steps = await callGroq(KILLCHAIN_SYSTEM_PROMPT, payload, { maxTokens: 2048 });
    res.json({ domain: scan.domain, steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
