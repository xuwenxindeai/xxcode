import { Tool, ToolResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

// 代码审查工具
export const codeReviewTool: Tool = {
  name: 'code_review',
  description: '对指定文件进行代码质量审查（检查命名、复杂度、潜在 bug、风格问题）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      focus: { type: 'string', description: '审查重点', enum: ['all', 'bugs', 'style', 'performance', 'security'] },
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
      const lines = content.split('\n');
      const ext = path.extname(fullPath);
      const issues: string[] = [];

      // 通用检查
      if (content.length > 10000) {
        issues.push(`⚠️  文件过大 (${(content.length / 1024).toFixed(1)} KB)，建议拆分`);
      }
      if (lines.length > 500) {
        issues.push(`⚠️  文件过长 (${lines.length} 行)，建议拆分`);
      }

      // JS/TS 检查
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        // 检查 console.log
        const consoleLogs = lines.filter(l => /console\.(log|warn|debug)/.test(l));
        if (consoleLogs.length > 0) {
          issues.push(`ℹ️  发现 ${consoleLogs.length} 个 console 输出`);
        }

        // 检查 TODO/FIXME
        const todos = lines.filter(l => /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/.test(l));
        if (todos.length > 0) {
          issues.push(`📝 发现 ${todos.length} 个待处理标记`);
        }

        // 检查 any 类型
        if (ext === '.ts' || ext === '.tsx') {
          const anys = lines.filter(l => /:\s*any\b/.test(l) && !/eslint-disable/.test(l));
          if (anys.length > 0) {
            issues.push(`⚠️  发现 ${anys.length} 个 any 类型，建议使用具体类型`);
          }
        }

        // 检查过长函数
        let inFunction = false, funcStart = 0, braceCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^\s*(async\s+)?function\s+\w+/.test(line) || /^\s*const\s+\w+\s*=\s*(async\s+)?\(/.test(line)) {
            inFunction = true;
            funcStart = i;
            braceCount = 0;
          }
          if (inFunction) {
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            if (braceCount <= 0 && i > funcStart + 50) {
              issues.push(`⚠️  行 ${funcStart + 1}: 函数过长 (${i - funcStart + 1} 行)`);
            }
            if (braceCount <= 0) inFunction = false;
          }
        }

        // 检查嵌套过深
        for (let i = 0; i < lines.length; i++) {
          const indent = lines[i].match(/^(\s+)/)?.[1].length || 0;
          if (indent >= 24) { // 6 级缩进
            issues.push(`⚠️  行 ${i + 1}: 缩进过深 (${indent / 4} 级)`);
          }
        }
      }

      // Python 检查
      if (ext === '.py') {
        const todos = lines.filter(l => /#\s*(TODO|FIXME|HACK|XXX)/.test(l));
        if (todos.length > 0) {
          issues.push(`📝 发现 ${todos.length} 个待处理标记`);
        }

        // 检查裸 except
        const bareExcept = lines.filter(l => /^\s*except\s*:/.test(l));
        if (bareExcept.length > 0) {
          issues.push(`⚠️  发现 ${bareExcept.length} 个裸 except，建议指定异常类型`);
        }
      }

      // 空文件
      if (content.trim().length === 0) {
        issues.push('ℹ️  空文件');
      }

      if (issues.length === 0) {
        return { success: true, output: `✅ ${path.basename(fullPath)}: 无明显问题` };
      }

      return { success: true, output: `📋 代码审查: ${path.basename(fullPath)}\n${issues.map(i => `  ${i}`).join('\n')}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 批量审查
export const batchReviewTool: Tool = {
  name: 'batch_review',
  description: '批量审查目录下的所有代码文件',
  parameters: {
    type: 'object',
    properties: {
      dir: { type: 'string', description: '目录路径', default: '.' },
      max_files: { type: 'number', description: '最大文件数', default: 10 },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const { glob } = require('glob');
      const targetDir = args.dir === '.' ? cwd : path.resolve(cwd, args.dir);
      const maxFiles = args.max_files || 10;

      const files = await glob('**/*.{ts,tsx,js,jsx,py,go,rs}', {
        cwd: targetDir,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      });

      if (files.length === 0) {
        return { success: true, output: '(无代码文件)' };
      }

      const results: string[] = [];
      for (const file of files.slice(0, maxFiles)) {
        const fullPath = path.join(targetDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lineCount = content.split('\n').length;
        const sizeKB = (content.length / 1024).toFixed(1);
        results.push(`📄 ${file} (${lineCount} 行, ${sizeKB} KB)`);

        // 快速检查
        if (lineCount > 500) results.push(`   ⚠️  文件过长`);
        if (content.includes('console.log')) results.push(`   ℹ️  包含 console.log`);
        if (content.includes('TODO') || content.includes('FIXME')) results.push(`   📝 包含 TODO/FIXME`);
      }

      if (files.length > maxFiles) {
        results.push(`\n... 还有 ${files.length - maxFiles} 个文件未审查`);
      }

      return { success: true, output: results.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
