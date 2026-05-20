import { Tool, ToolResult } from '../types';
import { exec } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = util.promisify(exec);

// 进程管理 - 列出进程
export const psTool: Tool = {
  name: 'list_processes',
  description: '列出当前运行的进程',
  parameters: {
    type: 'object',
    properties: {
      filter: { type: 'string', description: '过滤关键词（可选）' },
      limit: { type: 'number', description: '最大显示数量', default: 20 },
    },
    required: [],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const cmd = args.filter
        ? `ps aux | grep -i "${args.filter}" | grep -v grep | head -${args.limit || 20}`
        : `ps aux --sort=-%mem | head -${(args.limit || 20) + 1}`;

      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) return { success: true, output: '(无进程)' };

      const formatted = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          return `${parts[0].padEnd(12)} ${parts[1].padEnd(7)} ${(parts[2] + '%').padEnd(6)} ${(parts[3] + '%').padEnd(6)} ${parts.slice(10).join(' ')}`;
        }
        return line;
      });

      return { success: true, output: formatted.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 进程管理 - 杀死进程
export const killTool: Tool = {
  name: 'kill_process',
  description: '终止指定 PID 的进程',
  parameters: {
    type: 'object',
    properties: {
      pid: { type: 'number', description: '进程 ID' },
      signal: { type: 'string', description: '信号类型', enum: ['TERM', 'KILL', 'INT'], default: 'TERM' },
    },
    required: ['pid'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      await execAsync(`kill -${args.signal || 'TERM'} ${args.pid}`, { timeout: 5000 });
      return { success: true, output: `✅ 已发送 ${args.signal || 'TERM'} 信号到进程 ${args.pid}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 网络工具 - ping
export const pingTool: Tool = {
  name: 'ping',
  description: '测试网络连通性',
  parameters: {
    type: 'object',
    properties: {
      host: { type: 'string', description: '目标主机' },
      count: { type: 'number', description: 'ping 次数', default: 4 },
    },
    required: ['host'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const { stdout } = await execAsync(`ping -c ${args.count || 4} ${args.host}`, { timeout: 30000 });
      const lines = stdout.trim().split('\n');
      const summary = lines.slice(-3).join('\n');
      return { success: true, output: summary };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 网络工具 - 端口检查
export const portCheckTool: Tool = {
  name: 'check_port',
  description: '检查指定端口是否被占用',
  parameters: {
    type: 'object',
    properties: {
      port: { type: 'number', description: '端口号' },
    },
    required: ['port'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const { stdout } = await execAsync(`lsof -i :${args.port} -P -n`, { timeout: 5000 });
      if (!stdout.trim()) {
        return { success: true, output: `端口 ${args.port} 空闲` };
      }
      const lines = stdout.trim().split('\n');
      return { success: true, output: `⚠️  端口 ${args.port} 被占用:\n${lines.slice(0, 5).join('\n')}` };
    } catch (e: any) {
      return { success: true, output: `端口 ${args.port} 空闲` };
    }
  },
};

// 网络工具 - curl 请求
export const curlTool: Tool = {
  name: 'curl_request',
  description: '发送 HTTP 请求',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: '请求 URL' },
      method: { type: 'string', description: 'HTTP 方法', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
      headers: { type: 'string', description: '请求头（JSON 格式）' },
      body: { type: 'string', description: '请求体' },
    },
    required: ['url'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      let cmd = `curl -s -w "\n\n%{http_code}" -X ${args.method || 'GET'}`;

      if (args.headers) {
        const headers = JSON.parse(args.headers);
        for (const [key, value] of Object.entries(headers)) {
          cmd += ` -H "${key}: ${value}"`;
        }
      }

      if (args.body) {
        cmd += ` -d '${args.body.replace(/'/g, "'\\''")}'`;
      }

      cmd += ` "${args.url}"`;

      const { stdout } = await execAsync(cmd, { timeout: 30000 });
      const parts = stdout.split('\n\n');
      const httpCode = parts.pop()?.trim() || '';
      const body = parts.join('\n\n').trim();

      return {
        success: true,
        output: `HTTP ${httpCode}\n${body.slice(0, 5000)}`,
      };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 日志查看
export const logTool: Tool = {
  name: 'tail_log',
  description: '查看日志文件末尾内容',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '日志文件路径' },
      lines: { type: 'number', description: '行数', default: 50 },
      follow: { type: 'boolean', description: '是否持续跟踪（仅 10 秒）', default: false },
    },
    required: ['file_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      const lines = args.lines || 50;
      const cmd = args.follow
        ? `tail -f -n ${lines} "${fullPath}"`
        : `tail -n ${lines} "${fullPath}"`;

      const { stdout } = await execAsync(cmd, {
        timeout: args.follow ? 10000 : 5000,
        maxBuffer: 2 * 1024 * 1024,
      });

      return { success: true, output: stdout.trim() || '(空)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 性能监控
export const perfTool: Tool = {
  name: 'system_perf',
  description: '查看系统性能指标（CPU/内存/磁盘）',
  parameters: {
    type: 'object',
    properties: {
      metric: { type: 'string', description: '指标类型', enum: ['all', 'cpu', 'memory', 'disk'], default: 'all' },
    },
    required: [],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const results: string[] = [];

      if (args.metric === 'all' || args.metric === 'memory') {
        const { stdout: memOut } = await execAsync('vm_stat | head -10', { timeout: 5000 });
        const { stdout: memTotal } = await execAsync('sysctl -n hw.memsize', { timeout: 5000 });
        const totalGB = (parseInt(memTotal.trim()) / 1024 / 1024 / 1024).toFixed(1);
        results.push(`📊 内存总量: ${totalGB} GB`);
        results.push(memOut.trim());
      }

      if (args.metric === 'all' || args.metric === 'disk') {
        const { stdout: diskOut } = await execAsync('df -h / | tail -1', { timeout: 5000 });
        results.push(`\n💾 磁盘: ${diskOut.trim()}`);
      }

      if (args.metric === 'all' || args.metric === 'cpu') {
        const { stdout: cpuOut } = await execAsync('top -l 1 -n 0 | grep "CPU usage" | head -3', { timeout: 5000 });
        results.push(`\n⚡ CPU: ${cpuOut.trim()}`);
      }

      return { success: true, output: results.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
