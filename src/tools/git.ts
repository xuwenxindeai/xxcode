import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';

const execAsync = util.promisify(exec);

// Git 状态
export const gitStatusTool: Tool = {
  name: 'git_status',
  description: '查看 Git 当前状态（git status 简化版）',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, cwd): Promise<ToolResult> {
    try {
      const { stdout } = await execAsync('git status --short', {
        cwd, timeout: 10000, maxBuffer: 512 * 1024,
      });
      if (!stdout.trim()) return { success: true, output: '工作目录干净，无未提交更改' };
      return { success: true, output: stdout.trim() };
    } catch (e: any) {
      if (e.message.includes('not a git repository')) {
        return { success: true, output: '当前目录不是 Git 仓库' };
      }
      return { success: false, output: '', error: e.message };
    }
  },
};

// Git diff
export const gitDiffTool: Tool = {
  name: 'git_diff',
  description: '查看未暂存的文件差异（git diff），可指定文件名',
  parameters: {
    type: 'object',
    properties: {
      file: { type: 'string', description: '可选，指定文件名' },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const cmd = args.file ? `git diff -- '${args.file}'` : 'git diff';
      const { stdout } = await execAsync(cmd, {
        cwd, timeout: 10000, maxBuffer: 512 * 1024,
      });
      if (!stdout.trim()) return { success: true, output: '无未暂存的差异' };
      return { success: true, output: stdout.trim().slice(0, 5000) };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// Git commit
export const gitCommitTool: Tool = {
  name: 'git_commit',
  description: '添加所有更改并提交',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: '提交信息' },
    },
    required: ['message'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      await execAsync('git add -A', { cwd, timeout: 10000 });
      const { stdout } = await execAsync(`git commit -m '${args.message.replace(/'/g, "'\\''")}'`, {
        cwd, timeout: 10000,
      });
      return { success: true, output: stdout.trim() || '已提交' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// Git log
export const gitLogTool: Tool = {
  name: 'git_log',
  description: '查看最近的 Git 提交记录',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: '显示条数，默认 5', default: 5 },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -${args.limit || 5} --no-color`,
        { cwd, timeout: 10000 }
      );
      return { success: true, output: stdout.trim() || '无提交记录' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
