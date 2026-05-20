"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.updateSession = updateSession;
exports.listSessions = listSessions;
exports.deleteSession = deleteSession;
exports.getSession = getSession;
exports.formatSessionList = formatSessionList;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SESSIONS_DIR = '.agent-sessions';
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');
function ensureDir() {
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
}
function loadMeta() {
    ensureDir();
    if (fs.existsSync(SESSIONS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
        }
        catch {
            return { sessions: [] };
        }
    }
    return { sessions: [] };
}
function saveMeta(meta) {
    ensureDir();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(meta, null, 2));
}
function createSession(task) {
    const session = {
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
function updateSession(id, updates) {
    const meta = loadMeta();
    const idx = meta.sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
        meta.sessions[idx] = { ...meta.sessions[idx], ...updates, updatedAt: new Date().toISOString() };
        saveMeta(meta);
    }
}
function listSessions() {
    return loadMeta().sessions;
}
function deleteSession(id) {
    const meta = loadMeta();
    const before = meta.sessions.length;
    meta.sessions = meta.sessions.filter(s => s.id !== id);
    if (meta.sessions.length < before) {
        saveMeta(meta);
        return true;
    }
    return false;
}
function getSession(id) {
    return loadMeta().sessions.find(s => s.id === id) || null;
}
function formatSessionList() {
    const sessions = listSessions();
    if (sessions.length === 0)
        return '(无会话)';
    return sessions.slice(0, 20).map((s, i) => {
        const date = new Date(s.updatedAt).toLocaleString('zh-CN');
        return `  ${i + 1}. [${s.id}] ${date} | ${s.title} | 🔧${s.toolCalls} 💬${s.messageCount}`;
    }).join('\n');
}
//# sourceMappingURL=session.js.map