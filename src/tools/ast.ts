import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';

const execAsync = util.promisify(exec);

/**
 * 获取文件依赖关系（import/require 语句）
 */
export const dependenciesTool: Tool = {
  name: 'get_dependencies',
  description: '分析文件的 import/require 依赖关系',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '要分析的文件路径' },
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
      const deps: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // ES6 import
        const esMatch = trimmed.match(/^(?:import\s+.*?\s+from\s+|import\s+)(['"`])(.+?)\1/);
        if (esMatch) {
          deps.push(`import: ${esMatch[2]}`);
          continue;
        }
        // CommonJS require
        const reqMatch = trimmed.match(/(?:const|let|var)\s+.*?=\s*require\s*\(\s*['"`](.+?)['"`]\s*\)/);
        if (reqMatch) {
          deps.push(`require: ${reqMatch[1]}`);
          continue;
        }
        // Python import
        const pyMatch = trimmed.match(/^(?:from\s+(.+?)\s+import|import\s+(.+?))$/);
        if (pyMatch) {
          deps.push(`python: ${pyMatch[1] || pyMatch[2]}`);
        }
      }

      if (deps.length === 0) {
        return { success: true, output: '无显式依赖' };
      }

      return { success: true, output: deps.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

/**
 * 获取文件中的函数/类/变量列表（简易 AST 解析）
 */
export const symbolsTool: Tool = {
  name: 'list_symbols',
  description: '列出文件中定义的函数、类、变量（简易 AST 解析）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      language: { type: 'string', description: '语言类型，自动检测', default: 'auto' },
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
      const ext = path.extname(fullPath).toLowerCase();
      const symbols: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // JavaScript/TypeScript
        if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
          // class 定义
          const classMatch = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
          if (classMatch) {
            symbols.push(`class ${classMatch[1]} (line ${i + 1})`);
            continue;
          }
          // function 定义
          const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
          if (funcMatch) {
            symbols.push(`function ${funcMatch[1]}() (line ${i + 1})`);
            continue;
          }
          // const/let/var 箭头函数或赋值
          const varMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=?\s*(?:async\s*)?\(?/);
          if (varMatch && !varMatch[1].match(/^(if|else|for|while|switch|return|try|catch)$/)) {
            symbols.push(`const ${varMatch[1]} (line ${i + 1})`);
            continue;
          }
          // interface
          const ifaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/);
          if (ifaceMatch) {
            symbols.push(`interface ${ifaceMatch[1]} (line ${i + 1})`);
            continue;
          }
          // type
          const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)/);
          if (typeMatch) {
            symbols.push(`type ${typeMatch[1]} (line ${i + 1})`);
            continue;
          }
        }

        // Python
        if (['.py'].includes(ext)) {
          const defMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
          if (defMatch) {
            symbols.push(`def ${defMatch[1]}() (line ${i + 1})`);
            continue;
          }
          const classPyMatch = trimmed.match(/^class\s+(\w+)/);
          if (classPyMatch) {
            symbols.push(`class ${classPyMatch[1]} (line ${i + 1})`);
          }
        }

        // Swift
        if (['.swift'].includes(ext)) {
          const funcMatch = trimmed.match(/^(?:public|private|internal|override)?\s*func\s+(\w+)/);
          if (funcMatch) {
            symbols.push(`func ${funcMatch[1]}() (line ${i + 1})`);
            continue;
          }
          const classMatch = trimmed.match(/^(?:public|private|internal)?\s*(?:class|struct|enum|protocol)\s+(\w+)/);
          if (classMatch) {
            symbols.push(`${classMatch[1].match(/class|struct|enum|protocol/)?.[0] || 'class'} ${classMatch[1].replace(/^(class|struct|enum|protocol)\s*/, '')} (line ${i + 1})`);
          }
        }
      }

      if (symbols.length === 0) {
        return { success: true, output: '未检测到符号定义' };
      }

      const header = `${path.basename(fullPath)}: ${symbols.length} 个符号\n`;
      return { success: true, output: header + symbols.join('\n') };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

/**
 * 生成函数调用关系图（简易版）
 */
export const callGraphTool: Tool = {
  name: 'call_graph',
  description: '分析一组文件中的函数调用关系',
  parameters: {
    type: 'object',
    properties: {
      file_pattern: { type: 'string', description: '文件 glob 模式', default: '*.ts' },
    },
    required: [],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const pattern = args.file_pattern || '*.ts';
      const { glob } = await import('glob');
      const files = await glob(pattern, { cwd });

      if (files.length === 0) {
        return { success: true, output: '无匹配文件' };
      }

      const calls: string[] = [];

      for (const file of files.slice(0, 20)) { // 最多分析 20 个文件
        const content = fs.readFileSync(path.join(cwd, file), 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // 匹配函数调用: funcName(
          const callMatches = line.matchAll(/(\w+)\s*\(/g);
          for (const match of callMatches) {
            const funcName = match[1];
            if (['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new', 'console'].includes(funcName)) {
              continue;
            }
            calls.push(`${file}:${i + 1} → ${funcName}()`);
          }
        }
      }

      if (calls.length === 0) {
        return { success: true, output: '未检测到函数调用' };
      }

      const output = calls.slice(0, 100).join('\n');
      const suffix = calls.length > 100 ? `\n... (共 ${calls.length} 个调用，仅显示前 100)` : '';
      return { success: true, output: output + suffix };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
