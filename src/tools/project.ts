import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from '../types';

// 项目结构树
export const treeTool: Tool = {
  name: 'project_tree',
  description: '打印项目文件树（带缩进），适合快速了解项目结构',
  parameters: {
    type: 'object',
    properties: {
      dir: { type: 'string', description: '根目录，默认当前目录', default: '.' },
      depth: { type: 'number', description: '最大深度，默认 3', default: 3 },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const rootDir = args.dir === '.' ? cwd : path.resolve(cwd, args.dir);
      if (!fs.existsSync(rootDir)) {
        return { success: false, output: '', error: `目录不存在: ${rootDir}` };
      }
      const maxDepth = args.depth || 3;
      const tree = buildTree(rootDir, '', maxDepth, 0);
      return { success: true, output: tree };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 读取文件的部分内容（只看头部，适合了解文件结构）
export const peekTool: Tool = {
  name: 'peek_file',
  description: '读取文件的前 N 行，适合快速了解文件结构',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      lines: { type: 'number', description: '读取行数，默认 20', default: 20 },
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

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lineCount = args.lines || 20;
      const lines = content.split('\n').slice(0, lineCount);
      const output = lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
      const totalLines = content.split('\n').length;
      const suffix = totalLines > lineCount ? `\n...(共 ${totalLines} 行，仅显示前 ${lineCount} 行)` : '';
      return { success: true, output: output + suffix };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

function buildTree(dir: string, prefix: string, maxDepth: number, currentDepth: number): string {
  if (currentDepth > maxDepth) return '';

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist');

  let output = '';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const icon = entry.isDirectory() ? '📁' : '📄';
    output += `${prefix}${connector}${icon} ${entry.name}\n`;

    if (entry.isDirectory() && currentDepth < maxDepth) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      output += buildTree(path.join(dir, entry.name), newPrefix, maxDepth, currentDepth + 1);
    }
  }

  return output;
}
