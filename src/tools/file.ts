import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Tool, ToolResult } from '../types';
import { getUndoManager } from './undo';

const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;

function resolvePath(filePath: string, cwd: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(cwd, filePath);
}

// 读取文件
export const readTool: Tool = {
  name: 'read_file',
  description: '读取指定文件内容',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径（绝对或相对）' },
    },
    required: ['file_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = resolvePath(args.file_path, cwd);
      const content = await readFile(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 写入文件（自动快照）
export const writeTool: Tool = {
  name: 'write_file',
  description: '写入内容到文件，覆盖原内容。修改前自动保存快照支持撤销。',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      content: { type: 'string', description: '要写入的内容' },
    },
    required: ['file_path', 'content'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = resolvePath(args.file_path, cwd);
      // 自动快照（撤销用）
      if (fs.existsSync(fullPath)) {
        getUndoManager().saveBefore(fullPath);
      }
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await writeFile(fullPath, args.content, 'utf-8');
      return { success: true, output: `已写入 ${fullPath} (${Buffer.byteLength(args.content)} bytes)` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 搜索文件
export const searchFilesTool: Tool = {
  name: 'search_files',
  description: '按 glob 模式搜索文件',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'glob 模式，如 *.ts, src/**/*.ts' },
    },
    required: ['pattern'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const files = await glob(args.pattern, { cwd });
      return { success: true, output: files.join('\n') || '(无匹配文件)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 列出目录
export const listDirTool: Tool = {
  name: 'list_dir',
  description: '列出目录内容',
  parameters: {
    type: 'object',
    properties: {
      dir_path: { type: 'string', description: '目录路径，默认当前目录' },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const dir = resolvePath(args.dir_path || '.', cwd);
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const lines = entries.map(e => {
        const prefix = e.isDirectory() ? '📁' : '📄';
        return `${prefix} ${e.name}`;
      });
      return { success: true, output: lines.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
