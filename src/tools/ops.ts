import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = util.promisify(exec);

// 环境变量查看/设置
export const envTool: Tool = {
  name: 'env',
  description: '查看或设置环境变量',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: '操作', enum: ['list', 'get', 'set'] },
      key: { type: 'string', description: '变量名（get/set 时需要）' },
      value: { type: 'string', description: '变量值（set 时需要）' },
    },
    required: ['action'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      switch (args.action) {
        case 'list': {
          const vars = Object.entries(process.env)
            .filter(([k]) => !/TOKEN|SECRET|PASSWORD|PRIVATE|KEY/i.test(k))
            .map(([k, v]) => `${k}=${v}`)
            .slice(0, 50);
          return { success: true, output: vars.join('\n') };
        }
        case 'get': {
          if (!args.key) return { success: false, output: '', error: '需要指定 key' };
          const val = process.env[args.key];
          return { success: true, output: val !== undefined ? `${args.key}=${val}` : `${args.key} 未设置` };
        }
        case 'set': {
          if (!args.key || args.value === undefined) return { success: false, output: '', error: '需要 key 和 value' };
          process.env[args.key] = args.value;
          return { success: true, output: `✅ ${args.key}=${args.value}` };
        }
        default:
          return { success: false, output: '', error: `未知操作: ${args.action}` };
      }
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 本地 HTTP 服务器
export const httpServerTool: Tool = {
  name: 'start_http_server',
  description: '启动一个简单的本地 HTTP 静态文件服务器（无需额外依赖）',
  parameters: {
    type: 'object',
    properties: {
      port: { type: 'number', description: '端口号', default: 8080 },
      dir: { type: 'string', description: '目录路径', default: '.' },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const port = args.port || 8080;
      const dir = args.dir === '.' ? cwd : path.resolve(cwd, args.dir);
      if (!fs.existsSync(dir)) {
        return { success: false, output: '', error: `目录不存在: ${dir}` };
      }

      const serverCode = `
        const http = require('http');
        const fs = require('fs');
        const p = require('path');
        const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.md':'text/markdown','.txt':'text/plain'};
        http.createServer((req, res) => {
          let fp = p.join('${dir}', req.url === '/' ? 'index.html' : req.url);
          fs.readFile(fp, (err, data) => {
            if (err) { res.writeHead(404); res.end('404'); return; }
            res.writeHead(200, { 'Content-Type': mime[p.extname(fp)] || 'text/plain' });
            res.end(data);
          });
        }).listen(${port}, () => console.log('Serving ${dir} on http://localhost:${port}'));
      `;

      const tmpFile = path.join(cwd, '.tmp_http_server.js');
      fs.writeFileSync(tmpFile, serverCode);
      exec(`node "${tmpFile}" &`, { cwd });

      return { success: true, output: `✅ HTTP 服务器已启动: http://localhost:${port}\n目录: ${dir}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 压缩/解压
export const archiveTool: Tool = {
  name: 'archive',
  description: '压缩或解压文件（zip/tar.gz）',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: '操作', enum: ['compress', 'extract'] },
      source: { type: 'string', description: '源文件/目录' },
      dest: { type: 'string', description: '目标路径（可选）' },
    },
    required: ['action', 'source'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const source = path.isAbsolute(args.source) ? args.source : path.resolve(cwd, args.source);
      const dest = args.dest
        ? (path.isAbsolute(args.dest) ? args.dest : path.resolve(cwd, args.dest))
        : (args.action === 'compress' ? source + '.zip' : cwd);

      if (!fs.existsSync(source)) {
        return { success: false, output: '', error: `不存在: ${source}` };
      }

      let cmd: string;
      if (args.action === 'compress') {
        cmd = dest.endsWith('.tar.gz')
          ? `tar -czf "${dest}" -C "${path.dirname(source)}" "${path.basename(source)}"`
          : `zip -r "${dest}" "${source}"`;
      } else {
        cmd = source.endsWith('.tar.gz')
          ? `tar -xzf "${source}" -C "${dest}"`
          : `unzip -o "${source}" -d "${dest}"`;
      }

      const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 60000 });
      return { success: true, output: `✅ ${args.action === 'compress' ? '压缩' : '解压'}完成` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// SSH 远程命令
export const sshTool: Tool = {
  name: 'ssh_exec',
  description: '通过 SSH 在远程服务器执行命令',
  parameters: {
    type: 'object',
    properties: {
      host: { type: 'string', description: '远程主机 (user@host)' },
      command: { type: 'string', description: '要执行的命令' },
      port: { type: 'number', description: 'SSH 端口', default: 22 },
    },
    required: ['host', 'command'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const port = args.port || 22;
      const cmd = `ssh -o StrictHostKeyChecking=no -p ${port} ${args.host} "${args.command.replace(/"/g, '\\"')}"`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(无输出)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 配置读写（JSON）
export const configTool: Tool = {
  name: 'config',
  description: '读写 JSON 配置文件',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '配置文件路径（.json）' },
      action: { type: 'string', description: '操作', enum: ['read', 'set'] },
      key: { type: 'string', description: '键名（点号分隔，如 server.port）' },
      value: { type: 'string', description: '值（JSON 格式，set 时需要）' },
    },
    required: ['file_path', 'action'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      let config: Record<string, any> = {};
      if (fs.existsSync(fullPath)) {
        config = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      }

      if (args.action === 'read') {
        if (args.key) {
          const keys = args.key.split('.');
          let val: any = config;
          for (const k of keys) val = val?.[k];
          return { success: true, output: val !== undefined ? JSON.stringify(val, null, 2) : `${args.key} 不存在` };
        }
        return { success: true, output: JSON.stringify(config, null, 2) };
      }

      if (args.action === 'set') {
        if (!args.key || args.value === undefined) {
          return { success: false, output: '', error: '需要 key 和 value' };
        }
        const val = JSON.parse(args.value);
        const keys = args.key.split('.');
        let obj: any = config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = val;
        fs.writeFileSync(fullPath, JSON.stringify(config, null, 2));
        return { success: true, output: `✅ 已设置 ${args.key} = ${args.value}` };
      }

      return { success: false, output: '', error: `未知操作: ${args.action}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
