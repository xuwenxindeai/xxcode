import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from '../types';

// ========== Diff 补丁工具 ==========

// 应用 unified diff 补丁
export const applyDiffTool: Tool = {
  name: 'apply_diff',
  description: '使用 unified diff 格式精确修改文件。只改变指定的行，保留其余内容。这是最安全的代码修改方式。',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      diff: { type: 'string', description: 'unified diff 格式的补丁' },
    },
    required: ['file_path', 'diff'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      // 用系统的 patch 命令应用补丁
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      // 写入临时 diff 文件
      const tmpDiff = path.join(cwd, '.tmp_patch.diff');
      fs.writeFileSync(tmpDiff, args.diff);

      try {
        await execAsync(`patch -p0 --no-backup-if-mismatch -f -i "${tmpDiff}"`, {
          cwd: path.dirname(fullPath),
          timeout: 10000,
        });
      } finally {
        fs.unlinkSync(tmpDiff);
      }

      // 保存快照
      const { getUndoManager } = require('./undo');
      getUndoManager().saveBefore(fullPath);

      return { success: true, output: `✅ 补丁已应用到 ${fullPath}` };
    } catch (e: any) {
      return { success: false, output: '', error: `补丁应用失败: ${e.message}` };
    }
  },
};

// 生成文件的 unified diff
export const generateDiffTool: Tool = {
  name: 'generate_diff',
  description: '比较两段文本或文件的差异，生成 unified diff 格式输出',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '要 diff 的文件路径' },
    },
    required: ['file_path'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const { stdout } = await execAsync(`git diff -- "${fullPath}"`, {
        cwd, timeout: 5000,
      }).catch(() => ({ stdout: '', stderr: '' }));

      if (!stdout.trim()) {
        return { success: true, output: '(无差异 - 文件未修改)' };
      }

      return { success: true, output: stdout.trim() };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
