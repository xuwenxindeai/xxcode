import * as net from 'net';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface LSPClient {
  language: string;
  process: child_process.ChildProcess;
  nextRequestId: number;
  rootUri: string;
  initialized: boolean;
}

const lspClients = new Map<string, LSPClient>();

// LSP 语言服务器命令映射
const LSP_COMMANDS: Record<string, string[]> = {
  typescript: ['typescript-language-server', '--stdio'],
  javascript: ['typescript-language-server', '--stdio'],
  python: ['pyright-langserver', '--stdio'],
  go: ['gopls'],
  rust: ['rust-analyzer'],
  java: ['jdtls'],
  kotlin: ['kotlin-language-server'],
};

function detectLanguage(fileExt: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript',
    '.jsx': 'javascript', '.py': 'python', '.go': 'go',
    '.rs': 'rust', '.java': 'java', '.kt': 'kotlin',
  };
  return map[fileExt] || '';
}

function languageId(fileExt: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript',
    '.jsx': 'javascriptreact', '.py': 'python', '.go': 'go',
    '.rs': 'rust', '.java': 'java', '.kt': 'kotlin',
  };
  return map[fileExt] || 'plaintext';
}

// JSON-RPC 消息格式
function jsonRpcRequest(id: number, method: string, params: any): string {
  const content = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  return `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
}

function jsonRpcNotification(method: string, params: any): string {
  const content = JSON.stringify({ jsonrpc: '2.0', method, params });
  return `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
}

// 启动 LSP 服务器
export async function startLSP(filePath: string, rootDir: string): Promise<LSPClient | null> {
  const ext = path.extname(filePath);
  const lang = detectLanguage(ext);
  if (!lang) return null;

  // 如果已经有客户端，复用
  if (lspClients.has(lang)) {
    return lspClients.get(lang)!;
  }

  const cmd = LSP_COMMANDS[lang];
  if (!cmd) return null;

  // 检查命令是否存在
  const { execSync } = require('child_process');
  try {
    execSync(`which ${cmd[0]}`, { stdio: 'ignore' });
  } catch {
    return null; // LSP 未安装
  }

  const [exec, ...args] = cmd;
  const proc = child_process.spawn(exec, args, {
    cwd: rootDir,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const client: LSPClient = {
    language: lang,
    process: proc,
    nextRequestId: 1,
    rootUri: `file://${rootDir}`,
    initialized: false,
  };

  // 初始化 LSP
  const reqId = client.nextRequestId++;
  const initMsg = jsonRpcRequest(reqId, 'initialize', {
    processId: process.pid,
    rootUri: client.rootUri,
    capabilities: {
      textDocument: {
        hover: { contentFormat: ['plaintext'] },
        definition: { linkSupport: true },
        references: {},
        completion: { completionItem: { snippetSupport: false } },
        diagnostics: { relatedInformation: true },
      },
    },
  });

  const stdin = proc.stdin!;
  const stdout = proc.stdout!;

  stdin.write(initMsg);

  // 等待响应
  await new Promise<void>((resolve) => {
    let buffer = '';
    stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (buffer.length >= headerEnd + len) {
          const body = buffer.slice(headerEnd, headerEnd + len);
          try {
            const resp = JSON.parse(body);
            if (resp.id === reqId) {
              client.initialized = true;
              stdin.write(jsonRpcNotification('initialized', {}));
              resolve();
            }
          } catch {}
          buffer = buffer.slice(headerEnd + len);
        }
      }
    });
    setTimeout(resolve, 5000);
  });

  lspClients.set(lang, client);
  return client;
}

// 打开文件通知
function didOpen(client: LSPClient, filePath: string, text: string): void {
  client.process.stdin!.write(jsonRpcNotification('textDocument/didOpen', {
    textDocument: {
      uri: `file://${filePath}`,
      languageId: languageId(path.extname(filePath)),
      version: 1,
      text,
    },
  }));
}

// 获取悬浮提示
export async function lspHover(filePath: string, line: number, column: number): Promise<string | null> {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rootDir = path.dirname(filePath);
  const client = await startLSP(filePath, rootDir);
  if (!client) return null;

  didOpen(client, filePath, text);

  const reqId = client.nextRequestId++;
  const uri = `file://${filePath}`;
  const req = jsonRpcRequest(reqId, 'textDocument/hover', {
    textDocument: { uri },
    position: { line: line - 1, character: column - 1 },
  });

  return new Promise<string | null>((resolve) => {
    let buffer = '';
    const handler = (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (buffer.length >= headerEnd + len) {
          const body = buffer.slice(headerEnd, headerEnd + len);
          try {
            const resp = JSON.parse(body);
            if (resp.id === reqId) {
              client.process.stdout!.off('data', handler);
              const contents = resp.result?.contents;
              if (!contents) { resolve(null); return; }
              if (typeof contents === 'string') { resolve(contents); return; }
              if (Array.isArray(contents)) {
                resolve(contents.map((c: any) => typeof c === 'string' ? c : c.value).join('\n'));
                return;
              }
              if (contents.value) { resolve(contents.value); return; }
              resolve(null);
            }
          } catch {}
          buffer = buffer.slice(headerEnd + len);
        }
      }
    };
    client.process.stdout!.on('data', handler);
    client.process.stdin!.write(req);
    setTimeout(() => {
      client.process.stdout!.off('data', handler);
      resolve(null);
    }, 5000);
  });
}

// 跳转到定义
export async function lspDefinition(filePath: string, line: number, column: number): Promise<string | null> {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rootDir = path.dirname(filePath);
  const client = await startLSP(filePath, rootDir);
  if (!client) return null;

  didOpen(client, filePath, text);

  const reqId = client.nextRequestId++;
  const uri = `file://${filePath}`;
  const req = jsonRpcRequest(reqId, 'textDocument/definition', {
    textDocument: { uri },
    position: { line: line - 1, character: column - 1 },
  });

  return new Promise<string | null>((resolve) => {
    let buffer = '';
    const handler = (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (buffer.length >= headerEnd + len) {
          const body = buffer.slice(headerEnd, headerEnd + len);
          try {
            const resp = JSON.parse(body);
            if (resp.id === reqId) {
              client.process.stdout!.off('data', handler);
              const result = resp.result;
              if (!result) { resolve(null); return; }
              if (Array.isArray(result) && result.length > 0) {
                const loc = result[0];
                resolve(`${loc.uri?.replace('file://', '')}:${loc.range?.start.line + 1}:${loc.range?.start.character + 1}`);
                return;
              }
              if (result.uri) {
                resolve(`${result.uri.replace('file://', '')}:${result.range?.start.line + 1}:${result.range?.start.character + 1}`);
                return;
              }
              resolve(null);
            }
          } catch {}
          buffer = buffer.slice(headerEnd + len);
        }
      }
    };
    client.process.stdout!.on('data', handler);
    client.process.stdin!.write(req);
    setTimeout(() => {
      client.process.stdout!.off('data', handler);
      resolve(null);
    }, 5000);
  });
}

// 查找引用
export async function lspReferences(filePath: string, line: number, column: number): Promise<string | null> {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rootDir = path.dirname(filePath);
  const client = await startLSP(filePath, rootDir);
  if (!client) return null;

  didOpen(client, filePath, text);

  const reqId = client.nextRequestId++;
  const uri = `file://${filePath}`;
  const req = jsonRpcRequest(reqId, 'textDocument/references', {
    textDocument: { uri },
    position: { line: line - 1, character: column - 1 },
    context: { includeDeclaration: true },
  });

  return new Promise<string | null>((resolve) => {
    let buffer = '';
    const handler = (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (buffer.length >= headerEnd + len) {
          const body = buffer.slice(headerEnd, headerEnd + len);
          try {
            const resp = JSON.parse(body);
            if (resp.id === reqId) {
              client.process.stdout!.off('data', handler);
              const result = resp.result;
              if (!result || !Array.isArray(result) || result.length === 0) {
                resolve(null); return;
              }
              const lines = result.map((loc: any, i: number) => {
                const file = loc.uri?.replace('file://', '') || '';
                const ln = loc.range?.start.line + 1 || 0;
                return `${i + 1}. ${file}:${ln}`;
              });
              resolve(lines.join('\n'));
            }
          } catch {}
          buffer = buffer.slice(headerEnd + len);
        }
      }
    };
    client.process.stdout!.on('data', handler);
    client.process.stdin!.write(req);
    setTimeout(() => {
      client.process.stdout!.off('data', handler);
      resolve(null);
    }, 5000);
  });
}

// 获取诊断（错误/警告）
export async function lspDiagnostics(filePath: string): Promise<string | null> {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rootDir = path.dirname(filePath);
  const client = await startLSP(filePath, rootDir);
  if (!client) return null;

  didOpen(client, filePath, text);

  return new Promise<string | null>((resolve) => {
    const diagnostics: any[] = [];
    const uri = `file://${filePath}`;

    const handler = (chunk: Buffer) => {
      const data = chunk.toString();
      let remaining = data;
      while (true) {
        const match = remaining.match(/Content-Length: (\d+)\r\n\r\n/);
        if (!match) break;
        const len = parseInt(match[1]);
        const headerEnd = match.index! + match[0].length;
        if (remaining.length < headerEnd + len) break;

        const body = remaining.slice(headerEnd, headerEnd + len);
        try {
          const msg = JSON.parse(body);
          if (msg.method === 'textDocument/publishDiagnostics' && msg.params?.uri === uri) {
            diagnostics.push(...(msg.params.diagnostics || []));
          }
        } catch {}
        remaining = remaining.slice(headerEnd + len);
      }
    };

    client.process.stdout!.on('data', handler);

    setTimeout(() => {
      client.process.stdout!.off('data', handler);
      if (diagnostics.length === 0) {
        resolve('(无诊断)'); return;
      }
      const lines = diagnostics.map((d: any, i: number) => {
        const sev = d.severity === 1 ? '❌ 错误' : d.severity === 2 ? '⚠️  警告' : 'ℹ️  信息';
        return `${i + 1}. [${sev}] 行 ${d.range.start.line + 1}: ${d.message}`;
      });
      resolve(lines.join('\n'));
    }, 3000);
  });
}
