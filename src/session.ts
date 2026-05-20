import * as fs from 'fs';
import * as path from 'path';

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  messageCount: number;
  toolCalls: number;
  summary: string;
}

interface SessionMeta {
  sessions: Session[];
}

const SESSIONS_DIR = '.agent-sessions';
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');

function ensureDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function loadMeta(): SessionMeta {
  ensureDir();
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    } catch {
      return { sessions: [] };
    }
  }
  return { sessions: [] };
}

function saveMeta(meta: SessionMeta): void {
  ensureDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(meta, null, 2));
}

export function createSession(task: string): Session {
  const session: Session = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: task.slice(0, 50),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    task,
    messageCount: 0,
    toolCalls: 0,
    summary: '',
  };
  const meta = loadMeta();
  meta.sessions.unshift(session);
  saveMeta(meta);
  return session;
}

export function updateSession(id: string, updates: Partial<Session>): void {
  const meta = loadMeta();
  const idx = meta.sessions.findIndex(s => s.id === id);
  if (idx >= 0) {
    meta.sessions[idx] = { ...meta.sessions[idx], ...updates, updatedAt: new Date().toISOString() };
    saveMeta(meta);
  }
}

export function listSessions(): Session[] {
  return loadMeta().sessions;
}

export function deleteSession(id: string): boolean {
  const meta = loadMeta();
  const before = meta.sessions.length;
  meta.sessions = meta.sessions.filter(s => s.id !== id);
  if (meta.sessions.length < before) {
    saveMeta(meta);
    return true;
  }
  return false;
}

export function getSession(id: string): Session | null {
  return loadMeta().sessions.find(s => s.id === id) || null;
}

export function formatSessionList(): string {
  const sessions = listSessions();
  if (sessions.length === 0) return '(无会话)';

  return sessions.slice(0, 20).map((s, i) => {
    const date = new Date(s.updatedAt).toLocaleString('zh-CN');
    return `  ${i + 1}. [${s.id}] ${date} | ${s.title} | 🔧${s.toolCalls} 💬${s.messageCount}`;
  }).join('\n');
}
