import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import dns from 'dns';
import { createClient } from '@supabase/supabase-js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 3001;
const SHODAN_KEY = process.env.SHODAN_API_KEY;
const HIBP_KEY = process.env.HIBP_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'your_service_role_key_here') {
  console.warn('Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to enable persistence');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'your_service_role_key_here'
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const groq = GROQ_KEY && GROQ_KEY !== 'your_anthropic_api_key_here'
  ? { apiKey: GROQ_KEY }
  : null;

const CACHE_TTL_MS = 60 * 60 * 1000;
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';
const clientDistPath = isProd ? path.resolve(__dirname, '../client/dist') : null;

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

if (isProd && clientDistPath) {
  app.use(express.static(clientDistPath));
}

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
    return { score: 'Medium', reasons: ['HTTP only - no HTTPS'] };
  }

  return { score: 'Low', reasons: [] };
}

// --- Helpers ---

function normalizeDomain(input) {
  const value = String(input ?? '').trim().toLowerCase();
  const withoutProtocol = value.replace(/^https?:\/\//, '');
  const clean = withoutProtocol.split('/')[0].replace(/^\*\./, '');
  return clean.replace(/:\d+$/, '');
}

function msSince(dateLike) {
  if (!dateLike) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(dateLike).getTime();
}

async function getUserFromAuthHeader(req) {
  if (!supabase) return null;

  const auth = req.header('authorization') ?? req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

function authRequired(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      error: 'Server auth not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
    });
  }

  getUserFromAuthHeader(req)
    .then((user) => {
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      req.user = user;
      next();
      return null;
    })
    .catch(() => res.status(401).json({ error: 'Unauthorized' }));
}

function safeLogEvent(userId, action, metadata = {}) {
  return logEvent(userId, action, metadata).catch(() => {});
}

async function logEvent(userId, action, metadata = null) {
  if (!userId || !action) return;
  const { error } = await supabase.from('user_activity').insert({
    user_id: userId,
    action,
    metadata: metadata ?? {},
  });
  if (error) throw error;
}

async function ensureProfile(user) {
  if (!user?.id) return;
  const profile = {
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    provider: user.app_metadata?.provider ?? null,
    last_login_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

async function createScanRequest({ userId, scanId, domain, source, cacheAgeSeconds, forced }) {
  const { error } = await supabase.from('scan_requests').insert({
    user_id: userId,
    scan_id: scanId,
    domain,
    source,
    cache_age_seconds: cacheAgeSeconds,
    forced,
  });
  if (error) throw error;
}

function mapScanRow(row) {
  return {
    scanId: row.id,
    domain: row.domain,
    normalizedDomain: row.normalized_domain,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    error: row.error,
    crtshError: row.crtsh_error,
    source: row.source,
    cachedFromScanId: row.cached_from_scan_id,
    results: row.results,
    degraded: row.results?.degraded ?? false,
    degradedReason: row.results?.degradedReason ?? null,
  };
}

async function findLatestScanForDomain(normalizedDomain) {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('normalized_domain', normalizedDomain)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return (data ?? []).find((row) => row.results?.degraded !== true) ?? null;
}

async function findRunningScanForDomain(normalizedDomain) {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('normalized_domain', normalizedDomain)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createScanRow({ domain, normalizedDomain, source, cachedFromScanId = null }) {
  const now = new Date().toISOString();
  const row = {
    domain,
    normalized_domain: normalizedDomain,
    status: 'pending',
    created_at: now,
    source,
    cached_from_scan_id: cachedFromScanId,
  };

  const { data, error } = await supabase
    .from('scans')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function updateScanRow(scanId, patch) {
  const { error } = await supabase.from('scans').update(patch).eq('id', scanId);
  if (error) throw error;
}

// --- Scanning modules ---

async function fetchSubdomains(domain) {
  const timeout = 55_000;
  const retries = 2;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
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
    } catch (err) {
      if (attempt === retries) {
        if (err?.name === 'AbortError') {
          throw new Error(`crt.sh request timed out after ${Math.floor(timeout / 1000)}s`);
        }
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2000));
    } finally {
      clearTimeout(timer);
    }
  }
}

function safeText(value, maxLength = 200) {
  if (typeof value !== 'string') return null;
  const normalized = typeof value.toWellFormed === 'function' ? value.toWellFormed() : value;
  const withoutNull = normalized.replace(/\u0000/g, '');
  const cleaned = withoutNull.replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
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
        hostnames: (data.hostnames ?? []).map((name) => safeText(name, 150)).filter(Boolean),
        org: safeText(data.org, 150),
        os: safeText(data.os, 150),
        services: (data.data ?? []).map((s) => ({
          port: s.port,
          transport: s.transport,
          product: safeText(s.product, 120),
          version: safeText(s.version, 120),
          banner: safeText(s.data, 200),
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
  let crtshError = null;
  try {
    await updateScanRow(scanId, {
      status: 'running',
      started_at: new Date().toISOString(),
      error: null,
      crtsh_error: null,
    });

    const [subdomains, hibp] = await Promise.all([
      fetchSubdomains(domain).catch(async (err) => {
        crtshError = err.message;
        await updateScanRow(scanId, { crtsh_error: err.message });
        return [];
      }),
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

    await updateScanRow(scanId, {
      status: 'complete',
      completed_at: new Date().toISOString(),
      error: null,
      results: {
        totalSubdomains: allTargets.length,
        resolvedSubdomains: resolved.length,
        uniqueIPs,
        subdomains: scoredSubdomains,
        shodan,
        hibp,
        riskCounts,
        degraded: crtshError != null,
        degradedReason: crtshError,
      },
    });
  } catch (err) {
    const message = safeText(err?.message ?? 'Scan failed', 500) ?? 'Scan failed';
    try {
      await updateScanRow(scanId, {
        status: 'error',
        error: message,
        completed_at: new Date().toISOString(),
      });
    } catch (persistError) {
      console.error('Failed to persist scan error:', persistError);
    }
  }
}

// --- Routes ---

app.post('/api/events', authRequired, async (req, res) => {
  const { action, metadata } = req.body ?? {};
  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'action is required' });
  }

  try {
    await ensureProfile(req.user);
    await logEvent(req.user.id, action, metadata ?? {});
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/scans/recent', authRequired, async (req, res) => {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 20) : 5;

  const { data: requestRows, error: requestError } = await supabase
    .from('scan_requests')
    .select('scan_id,domain,created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit * 4);

  if (requestError) return res.status(500).json({ error: requestError.message });

  const scanIds = [...new Set((requestRows ?? []).map((row) => row.scan_id))];
  if (scanIds.length === 0) return res.json({ history: [] });

  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('id,domain,completed_at,results,status')
    .in('id', scanIds);

  if (scanError) return res.status(500).json({ error: scanError.message });

  const scanMap = new Map((scans ?? []).map((scan) => [scan.id, scan]));

  const unique = new Map();
  for (const row of requestRows ?? []) {
    const scan = scanMap.get(row.scan_id);
    if (!scan || scan.status !== 'complete') continue;
    if (unique.has(scan.id)) continue;
    unique.set(scan.id, {
      scanId: scan.id,
      domain: scan.domain,
      completedAt: scan.completed_at,
      riskCounts: scan.results?.riskCounts ?? {},
    });
    if (unique.size >= limit) break;
  }

  return res.json({ history: [...unique.values()] });
});

app.post('/api/scan', authRequired, async (req, res) => {
  const normalizedDomain = normalizeDomain(req.body?.domain);
  const forceRescan = Boolean(req.body?.forceRescan);

  if (!normalizedDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizedDomain)) {
    return res.status(400).json({ error: 'valid domain is required' });
  }

  const domain = normalizedDomain;

  try {
    await ensureProfile(req.user);

    if (!forceRescan) {
      const running = await findRunningScanForDomain(normalizedDomain);
      if (running) {
        await createScanRequest({
          userId: req.user.id,
          scanId: running.id,
          domain,
          source: 'running',
          cacheAgeSeconds: null,
          forced: false,
        });

        await safeLogEvent(req.user.id, 'scan.start', {
          domain,
          scanId: running.id,
          source: 'running',
        });

        return res.json({ scanId: running.id, source: 'running', cached: true, cacheAgeSeconds: null });
      }

      const latest = await findLatestScanForDomain(normalizedDomain);
      if (latest && latest.status === 'complete') {
        const ageMs = msSince(latest.completed_at);
        if (ageMs <= CACHE_TTL_MS) {
          const ageSeconds = Math.max(0, Math.floor(ageMs / 1000));

          await createScanRequest({
            userId: req.user.id,
            scanId: latest.id,
            domain,
            source: 'cache',
            cacheAgeSeconds: ageSeconds,
            forced: false,
          });

          await safeLogEvent(req.user.id, 'scan.start', {
            domain,
            scanId: latest.id,
            source: 'cache',
            cacheAgeSeconds: ageSeconds,
          });

          return res.json({
            scanId: latest.id,
            source: 'cache',
            cached: true,
            cacheAgeSeconds: ageSeconds,
          });
        }
      }
    }

    const scan = await createScanRow({
      domain,
      normalizedDomain,
      source: forceRescan ? 'forced' : 'fresh',
    });

    await createScanRequest({
      userId: req.user.id,
      scanId: scan.id,
      domain,
      source: forceRescan ? 'forced' : 'fresh',
      cacheAgeSeconds: null,
      forced: forceRescan,
    });

    await safeLogEvent(req.user.id, 'scan.start', {
      domain,
      scanId: scan.id,
      source: forceRescan ? 'forced' : 'fresh',
    });

    runScan(scan.id, domain).catch((err) => {
      console.error('runScan fatal error:', err);
    });

    return res.json({
      scanId: scan.id,
      source: forceRescan ? 'forced' : 'fresh',
      cached: false,
      cacheAgeSeconds: null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/:scanId', authRequired, async (req, res) => {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', req.params.scanId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Scan not found' });

  const mapped = mapScanRow(data);

  if (mapped.status === 'complete') {
    const ageSeconds = Math.max(0, Math.floor(msSince(mapped.completedAt) / 1000));
    mapped.cacheAgeSeconds = ageSeconds;
    mapped.cached = ageSeconds <= Math.floor(CACHE_TTL_MS / 1000);
  }

  return res.json(mapped);
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
      Authorization: `Bearer ${groq.apiKey}`,
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

Return ONLY a valid JSON array - no markdown fences, no explanation - where each element is:
{
  "asset": "<subdomain>",
  "fixes": ["<plain-english step>", ...],
  "patches": [
    { "type": "nginx" | "cloudflare" | "htaccess" | "iptables", "filename": "<short suggested filename>", "content": "<the full config snippet, properly escaped>" }
  ]
}

Rules:
- "patches" must contain real, working config snippets - not pseudocode, not comments-only.
- Choose the patch types that actually fit the risks. Most web exposures need nginx + cloudflare. SSH/DB exposures need iptables. Apache stacks get htaccess. Include 1-4 patches per asset.
- Keep each "content" tight (10-40 lines). No placeholder TODOs.

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

app.post('/api/suggest', authRequired, async (req, res) => {
  const { assets, scanId } = req.body;
  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'assets array required' });
  }

  try {
    const payload = assets.map((a) => ({ asset: a.subdomain, ports: a.ports, risks: a.risk.reasons }));
    const suggestions = await callGroq(SUGGEST_SYSTEM_PROMPT, payload, { maxTokens: 4096 });

    if (scanId) {
      const { error: insertError } = await supabase.from('ai_suggestions').insert({
        scan_id: scanId,
        user_id: req.user.id,
        payload: suggestions,
      });
      if (insertError) throw insertError;
    }

    await safeLogEvent(req.user.id, 'ai.fixes_requested', {
      scanId: scanId ?? null,
      assetsCount: assets.length,
    });

    return res.json({ suggestions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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

app.post('/api/killchain/:scanId', authRequired, async (req, res) => {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', req.params.scanId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Scan not found' });
  if (data.status !== 'complete') return res.status(409).json({ error: 'Scan not complete' });

  try {
    const r = data.results ?? {};
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
      domain: data.domain,
      breachCount: r.hibp?.breachCount ?? 0,
      breachAccounts,
      highRisk,
      mediumRisk,
    };

    const steps = await callGroq(KILLCHAIN_SYSTEM_PROMPT, payload, { maxTokens: 2048 });

    await safeLogEvent(req.user.id, 'killchain.generated', {
      scanId: req.params.scanId,
      domain: data.domain,
    });

    res.json({ domain: data.domain, steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Health check ---
app.get('/', (_req, res) => res.json({ ok: true, service: 'exposureiq-api' }));

if (isProd && clientDistPath) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
