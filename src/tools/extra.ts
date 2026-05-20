import { Tool, ToolResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// 数据库工具 - SQLite
export const sqliteQueryTool: Tool = {
  name: 'sqlite_query',
  description: '执行 SQLite 数据库查询。需要 sqlite3 CLI 已安装。',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: 'SQLite 数据库文件路径' },
      query: { type: 'string', description: 'SQL 查询语句' },
    },
    required: ['db_path', 'query'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
      if (!fs.existsSync(dbPath)) {
        return { success: false, output: '', error: `数据库文件不存在: ${dbPath}` };
      }

      const { stdout, stderr } = await execAsync(`sqlite3 "${dbPath}" -header -column "${args.query}"`, {
        cwd, timeout: 10000,
      });

      const output = stdout.trim();
      if (!output) return { success: true, output: '(无结果)' };
      return { success: true, output };
    } catch (e: any) {
      return { success: false, output: '', error: e.stderr || e.message };
    }
  },
};

// 数据库工具 - 列出 SQLite 表
export const sqliteTablesTool: Tool = {
  name: 'sqlite_tables',
  description: '列出 SQLite 数据库中的所有表',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: 'SQLite 数据库文件路径' },
    },
    required: ['db_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
      const { stdout } = await execAsync(`sqlite3 "${dbPath}" ".tables"`, {
        cwd, timeout: 5000,
      });

      const tables = stdout.trim();
      if (!tables) return { success: true, output: '(无表)' };
      return { success: true, output: tables };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 数据库工具 - 查看表结构
export const sqliteSchemaTool: Tool = {
  name: 'sqlite_schema',
  description: '查看 SQLite 表的 schema（列名、类型、约束）',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: 'SQLite 数据库文件路径' },
      table: { type: 'string', description: '表名（可选，不指定则显示所有表）' },
    },
    required: ['db_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
      const cmd = args.table
        ? `sqlite3 "${dbPath}" ".schema ${args.table}"`
        : `sqlite3 "${dbPath}" ".schema"`;

      const { stdout } = await execAsync(cmd, { cwd, timeout: 5000 });
      return { success: true, output: stdout.trim() || '(无 schema)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 代码格式化工具
export const formatTool: Tool = {
  name: 'format_code',
  description: '格式化代码文件（需要对应格式化工具已安装）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      formatter: { type: 'string', description: '格式化工具', enum: ['prettier', 'black', 'gofmt', 'clang-format', 'auto'] },
    },
    required: ['file_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      const ext = path.extname(fullPath);
      let formatter = args.formatter || 'auto';

      if (formatter === 'auto') {
        if (['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html', '.yaml', '.yml'].includes(ext)) {
          formatter = 'prettier';
        } else if (ext === '.py') formatter = 'black';
        else if (ext === '.go') formatter = 'gofmt';
        else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) formatter = 'clang-format';
        else return { success: false, output: '', error: `无法自动检测格式化工具（${ext}）` };
      }

      // 保存快照
      const { getUndoManager } = require('./undo');
      getUndoManager().saveBefore(fullPath);

      let cmd: string;
      switch (formatter) {
        case 'prettier': cmd = `npx prettier --write "${fullPath}"`; break;
        case 'black': cmd = `black "${fullPath}"`; break;
        case 'gofmt': cmd = `gofmt -w "${fullPath}"`; break;
        case 'clang-format': cmd = `clang-format -i "${fullPath}"`; break;
        default: return { success: false, output: '', error: `未知格式化工具: ${formatter}` };
      }

      const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 30000 });
      const output = stdout || stderr || '';
      return { success: true, output: `✅ 已用 ${formatter} 格式化: ${fullPath}\n${output}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.stderr || e.message };
    }
  },
};

// 截图分析 - 读取图片元信息
export const readImageTool: Tool = {
  name: 'read_image',
  description: '读取图片文件的元信息（尺寸、格式、大小）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '图片文件路径' },
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

      const stats = fs.statSync(fullPath);
      const size = (stats.size / 1024).toFixed(1);
      const ext = path.extname(fullPath).slice(1).toUpperCase();

      // 用 sips 获取图片尺寸（macOS 内置）
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      let dimensions = '';
      try {
        const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${fullPath}"`, { timeout: 5000 });
        const w = stdout.match(/pixelWidth: (\d+)/)?.[1];
        const h = stdout.match(/pixelHeight: (\d+)/)?.[1];
        if (w && h) dimensions = `${w} x ${h}`;
      } catch {}

      const info = [
        `📷 ${path.basename(fullPath)}`,
        `   格式: ${ext}`,
        `   大小: ${size} KB`,
        dimensions ? `   尺寸: ${dimensions}` : '',
      ].filter(Boolean).join('\n');

      return { success: true, output: info };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 桌面通知
export const notifyTool: Tool = {
  name: 'notify',
  description: '发送 macOS 桌面通知',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '通知标题' },
      message: { type: 'string', description: '通知内容' },
    },
    required: ['title', 'message'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    try {
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "${args.message}" with title "${args.title}"'`);
      return { success: true, output: `🔔 通知已发送: ${args.title}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// MCP 状态
export const mcpStatusTool: Tool = {
  name: 'mcp_status',
  description: '查看已连接的 MCP 服务器和可用工具',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, _cwd): Promise<ToolResult> {
    try {
      const { getMCPStatus, getMCPTools } = require('../mcp');
      const status = getMCPStatus();
      const tools = getMCPTools();

      let output = `MCP 服务器状态:\n${status}`;
      if (tools.length > 0) {
        output += '\n\n可用 MCP 工具:';
        for (const t of tools) {
          output += `\n  • ${t.name} (${t.server}): ${t.description}`;
        }
      }
      return { success: true, output };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
