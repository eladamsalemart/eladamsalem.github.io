// The control room's agent: a small server on the owner's own computer (127.0.0.1 only) that passes what he writes in the
// control room (#/admin/agent) to Claude Code, working in this repository, and streams the answer back.
// Start it with studio/agent/start-agent.cmd. First run: it makes a token (studio/agent/.token) and prints it; paste it once
// in the control room. Claude Code must be signed in on this computer (run `claude` once and /login).
// Env: AGENT_PORT (8799), BRIDGE_MOCK=1 (answers without Claude, to test the plumbing).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
const PORT = +process.env.AGENT_PORT || 8799, MOCK = process.env.BRIDGE_MOCK === '1';
const ORIGINS = new Set(['https://eladamsalem.com', 'https://www.eladamsalem.com', 'http://localhost:8197', 'http://127.0.0.1:8197']);
const TOKEN_FILE = path.join(HERE, '.token');
if (!fs.existsSync(TOKEN_FILE)) fs.writeFileSync(TOKEN_FILE, crypto.randomBytes(24).toString('hex'));
const TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
const CONTEXT = fs.readFileSync(path.join(HERE, 'CONTEXT.md'), 'utf8');
const TOOLS = 'Read,Glob,Grep,Edit,Write,WebSearch,WebFetch,Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git add:*),Bash(git commit:*),Bash(git pull:*),Bash(git push:*),Bash(node:*),Bash(python:*)';
const CLAUDE = process.platform === 'win32' ? 'claude.cmd' : 'claude';

const cors = (req, res) => {
  const o = req.headers.origin;
  if (o && ORIGINS.has(o)) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  return !o || ORIGINS.has(o);
};
const authed = req => (req.headers.authorization || '') === `Bearer ${TOKEN}`;
const body = req => new Promise(r => { let b = ''; req.on('data', d => { b += d; if (b.length > 2e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
const line = (res, o) => res.write(JSON.stringify(o) + '\n');

http.createServer(async (req, res) => {
  if (!cors(req, res)) { res.statusCode = 403; return res.end(); }
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.url === '/status') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ ok: true, authed: authed(req), mock: MOCK })); }
  if (req.url === '/ask' && req.method === 'POST') {
    if (!authed(req)) { res.statusCode = 401; return res.end('token'); }
    const { message, session } = await body(req);
    if (!message || typeof message !== 'string') { res.statusCode = 400; return res.end(); }
    res.setHeader('content-type', 'application/x-ndjson; charset=utf-8'); res.setHeader('cache-control', 'no-store');
    if (MOCK) { for (const w of `קיבלתי: ${message}`.split(' ')) { line(res, { t: w + ' ' }); await new Promise(r => setTimeout(r, 60)); } line(res, { done: true, session: session || 'mock' }); return res.end(); }
    const args = ['-p', message, '--output-format', 'stream-json', '--verbose', '--append-system-prompt', CONTEXT, '--permission-mode', 'acceptEdits', '--allowedTools', TOOLS];
    if (session && /^[\w-]{8,64}$/.test(session)) args.push('--resume', session);
    const p = spawn(CLAUDE, args, { cwd: REPO, shell: process.platform === 'win32', windowsHide: true });
    let buf = '', sid = session || '', err = '';
    p.stdout.on('data', d => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!l) continue;
        let j; try { j = JSON.parse(l); } catch { continue; }
        if (j.session_id) sid = j.session_id;
        if (j.type === 'assistant' && j.message && Array.isArray(j.message.content)) for (const c of j.message.content) {
          if (c.type === 'text' && c.text) line(res, { t: c.text });
          else if (c.type === 'tool_use') line(res, { tool: c.name });
        }
      }
    });
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => { line(res, { done: true, session: sid, error: code ? (err.trim().slice(-300) || `exit ${code}`) : undefined }); res.end(); });
    res.on('close', () => { if (p.exitCode === null) p.kill(); });
    return;
  }
  res.statusCode = 404; res.end();
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Open Studio agent on http://127.0.0.1:${PORT}${MOCK ? ' (mock)' : ''}`);
  console.log(`Token (paste it once in the control room, tab "סוכן"): ${TOKEN}`);
});
