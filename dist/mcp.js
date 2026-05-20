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
exports.connectMCP = connectMCP;
exports.callMCP = callMCP;
exports.getMCPTools = getMCPTools;
exports.getMCPStatus = getMCPStatus;
const child_process = __importStar(require("child_process"));
const mcpServers = new Map();
// JSON-RPC over stdio
function writeMCP(proc, msg) {
    const content = JSON.stringify(msg);
    proc.stdin.write(`Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`);
}
function readMCPResponse(proc, timeoutMs) {
    return new Promise((resolve) => {
        let buffer = '';
        const handler = (chunk) => {
            buffer += chunk.toString();
            const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
            if (match) {
                const len = parseInt(match[1]);
                const headerEnd = match.index + match[0].length;
                if (buffer.length >= headerEnd + len) {
                    const body = buffer.slice(headerEnd, headerEnd + len);
                    proc.stdout.off('data', handler);
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve(null);
                    }
                }
            }
        };
        proc.stdout.on('data', handler);
        setTimeout(() => {
            proc.stdout.off('data', handler);
            resolve(null);
        }, timeoutMs);
    });
}
async function connectMCP(name, command, args) {
    // 检查命令是否存在
    const { execSync } = child_process;
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
    }
    catch {
        return null;
    }
    const proc = child_process.spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const server = { name, command, args, process: proc, connected: false, tools: [] };
    // 初始化
    writeMCP(proc, {
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'coding-agent', version: '1.5.0' } },
    });
    const initResp = await readMCPResponse(proc, 5000);
    if (!initResp?.result)
        return null;
    // 发送 initialized 通知
    writeMCP(proc, { jsonrpc: '2.0', method: 'notifications/initialized' });
    // 获取工具列表
    writeMCP(proc, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const toolsResp = await readMCPResponse(proc, 5000);
    if (toolsResp?.result?.tools) {
        server.tools = toolsResp.result.tools.map((t) => ({ ...t, server: name }));
    }
    server.connected = true;
    mcpServers.set(name, server);
    return server;
}
async function callMCP(serverName, toolName, args) {
    const server = mcpServers.get(serverName);
    if (!server?.connected || !server.process)
        return null;
    writeMCP(server.process, {
        jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
        params: { name: toolName, arguments: args },
    });
    const resp = await readMCPResponse(server.process, 15000);
    if (resp?.result?.content) {
        return resp.result.content.map((c) => c.text || '').join('\n');
    }
    return resp?.error?.message || null;
}
function getMCPTools() {
    const all = [];
    for (const s of mcpServers.values()) {
        if (s.connected)
            all.push(...s.tools);
    }
    return all;
}
function getMCPStatus() {
    const lines = [];
    for (const [name, s] of mcpServers) {
        lines.push(`${s.connected ? '✅' : '❌'} ${name}: ${s.tools.length} 工具`);
    }
    return lines.join('\n') || '(无 MCP 服务器)';
}
//# sourceMappingURL=mcp.js.map