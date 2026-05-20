import * as net from 'net';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  server: string;
}

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  process: child_process.ChildProcess | null;
  connected: boolean;
  tools: MCPTool[];
}

const mcpServers = new Map<string, MCPServer>();

// JSON-RPC over stdio
function writeMCP(proc: child_process.ChildProcess, msg: any) {
  const content = JSON.stringify(msg);
  proc.stdin!.write(`Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`);
}

function readMCPResponse(proc: child_process.ChildProcess, timeoutMs: number): Promise<any> {
  return new Promise((resolve) => {
    let buffer = '';
    const handler = (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (buffer.length >= headerEnd + len) {
          const body = buffer.slice(headerEnd, headerEnd + len);
          proc.stdout!.off('data', handler);
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        }
      }
    };
    proc.stdout!.on('data', handler);
    setTimeout(() => {
      proc.stdout!.off('data', handler);
      resolve(null);
    }, timeoutMs);
  });
}

export async function connectMCP(name: string, command: string, args: string[]): Promise<MCPServer | null> {
  // 检查命令是否存在
  const { execSync } = child_process;
  try { execSync(`which ${command}`, { stdio: 'ignore' }); }
  catch { return null; }

  const proc = child_process.spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  const server: MCPServer = { name, command, args, process: proc, connected: false, tools: [] };

  // 初始化
  writeMCP(proc, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'coding-agent', version: '1.5.0' } },
  });
  const initResp = await readMCPResponse(proc, 5000);
  if (!initResp?.result) return null;

  // 发送 initialized 通知
  writeMCP(proc, { jsonrpc: '2.0', method: 'notifications/initialized' });

  // 获取工具列表
  writeMCP(proc, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const toolsResp = await readMCPResponse(proc, 5000);
  if (toolsResp?.result?.tools) {
    server.tools = toolsResp.result.tools.map((t: any) => ({ ...t, server: name }));
  }

  server.connected = true;
  mcpServers.set(name, server);
  return server;
}

export async function callMCP(serverName: string, toolName: string, args: Record<string, any>): Promise<string | null> {
  const server = mcpServers.get(serverName);
  if (!server?.connected || !server.process) return null;

  writeMCP(server.process, {
    jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
    params: { name: toolName, arguments: args },
  });

  const resp = await readMCPResponse(server.process, 15000);
  if (resp?.result?.content) {
    return resp.result.content.map((c: any) => c.text || '').join('\n');
  }
  return resp?.error?.message || null;
}

export function getMCPTools(): MCPTool[] {
  const all: MCPTool[] = [];
  for (const s of mcpServers.values()) {
    if (s.connected) all.push(...s.tools);
  }
  return all;
}

export function getMCPStatus(): string {
  const lines: string[] = [];
  for (const [name, s] of mcpServers) {
    lines.push(`${s.connected ? '✅' : '❌'} ${name}: ${s.tools.length} 工具`);
  }
  return lines.join('\n') || '(无 MCP 服务器)';
}
