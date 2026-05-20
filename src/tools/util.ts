import { Tool, ToolResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

// 数据库工具 - SQLite 查询
export const sqliteQueryTool: Tool = {
  name: 'sqlite_query',
  description: '执行 SQLite 数据库查询（需要 sqlite3 CLI）',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: '数据库文件路径 (.db / .sqlite)' },
      query: { type: 'string', description: 'SQL 查询语句' },
    },
    required: ['db_path', 'query'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
      if (!fs.existsSync(dbPath)) {
        return { success: false, output: '', error: `数据库文件不存在: ${dbPath}` };
      }
      const { stdout } = await execAsync(`sqlite3 -header -column "${dbPath}" "${args.query.replace(/"/g, '\\"')}"`, {
        cwd, timeout: 10000,
      });
      return { success: true, output: stdout.trim() || '(无结果)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 列出表
export const sqliteTablesTool: Tool = {
  name: 'sqlite_tables',
  description: '列出 SQLite 数据库中的所有表',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: '数据库文件路径' },
    },
    required: ['db_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
      const { stdout } = await execAsync(`sqlite3 "${dbPath}" ".tables"`, { cwd, timeout: 5000 });
      return { success: true, output: stdout.trim() || '(无表)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 表结构
export const sqliteSchemaTool: Tool = {
  name: 'sqlite_schema',
  description: '查看 SQLite 表的建表语句（schema）',
  parameters: {
    type: 'object',
    properties: {
      db_path: { type: 'string', description: '数据库文件路径' },
      table: { type: 'string', description: '表名（可选，不填则显示所有表）' },
    },
    required: ['db_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
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

// 代码格式化
export const formatTool: Tool = {
  name: 'format_code',
  description: '格式化代码文件（根据文件类型自动选择 prettier / black / gofmt / clang-format）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
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

      const ext = path.extname(fullPath);
      let cmd: string | null = null;

      if (['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.md', '.yaml', '.html'].includes(ext)) {
        cmd = `npx prettier --write "${fullPath}" 2>&1`;
      } else if (ext === '.py') {
        cmd = `black "${fullPath}" 2>&1`;
      } else if (ext === '.go') {
        cmd = `gofmt -w "${fullPath}" 2>&1`;
      } else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
        cmd = `clang-format -i "${fullPath}" 2>&1`;
      }

      if (!cmd) {
        return { success: false, output: '', error: `不支持的文件格式: ${ext}` };
      }

      // 保存快照
      const { getUndoManager } = require('./undo');
      getUndoManager().saveBefore(fullPath);

      const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 30000 });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: `✅ 已格式化\n${output}`.trim() || '✅ 已格式化' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 图片分析
export const readImageTool: Tool = {
  name: 'read_image',
  description: '读取图片文件的尺寸和大小（macOS sips）',
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
      const sizeKB = (stats.size / 1024).toFixed(1);
      const ext = path.extname(fullPath).slice(1).toUpperCase();

      let dims = '';
      try {
        const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${fullPath}"`, { timeout: 5000 });
        const w = stdout.match(/pixelWidth:\s+(\d+)/)?.[1];
        const h = stdout.match(/pixelHeight:\s+(\d+)/)?.[1];
        if (w && h) dims = `${w}×${h}`;
      } catch {}

      const info = [`📷 ${path.basename(fullPath)}`, `格式: ${ext}`, `大小: ${sizeKB} KB`];
      if (dims) info.push(`尺寸: ${dims}`);

      return { success: true, output: info.join('\n') };
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
  description: '查看 MCP 服务器状态和可用工具',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, _cwd): Promise<ToolResult> {
    try {
      const { getMCPStatus, getMCPTools } = require('../mcp');
      const status = getMCPStatus();
      const mcpTools = getMCPTools();
      let output = `MCP 服务器:\n${status}`;
      if (mcpTools.length > 0) {
        output += '\n\nMCP 工具:';
        for (const t of mcpTools) {
          output += `\n  • ${t.name} (${t.server}): ${t.description}`;
        }
      }
      return { success: true, output };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
