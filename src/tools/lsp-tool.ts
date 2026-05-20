import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from '../types';
import { lspHover, lspDefinition, lspReferences, lspDiagnostics } from '../lsp';

// LSP 悬浮提示
export const lspHoverTool: Tool = {
  name: 'lsp_hover',
  description: '获取光标位置的类型信息和文档注释（需要对应的 LSP 服务器已安装）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      line: { type: 'number', description: '行号（从 1 开始）' },
      column: { type: 'number', description: '列号（从 1 开始）', default: 1 },
    },
    required: ['file_path', 'line'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      const result = await lspHover(fullPath, args.line, args.column || 1);
      if (!result) {
        return { success: true, output: '(无悬浮信息)' };
      }
      return { success: true, output: result };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// LSP 跳转到定义
export const lspDefinitionTool: Tool = {
  name: 'lsp_definition',
  description: '跳转到符号的定义位置（需要对应的 LSP 服务器已安装）',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      line: { type: 'number', description: '行号' },
      column: { type: 'number', description: '列号', default: 1 },
    },
    required: ['file_path', 'line'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      const result = await lspDefinition(fullPath, args.line, args.column || 1);
      if (!result) {
        return { success: true, output: '(未找到定义)' };
      }
      return { success: true, output: `定义位置: ${result}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// LSP 查找引用
export const lspReferencesTool: Tool = {
  name: 'lsp_references',
  description: '查找符号的所有引用位置',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      line: { type: 'number', description: '行号' },
      column: { type: 'number', description: '列号', default: 1 },
    },
    required: ['file_path', 'line'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      const result = await lspReferences(fullPath, args.line, args.column || 1);
      if (!result) {
        return { success: true, output: '(未找到引用)' };
      }
      return { success: true, output: result };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// LSP 诊断
export const lspDiagnosticsTool: Tool = {
  name: 'lsp_diagnostics',
  description: '获取文件的编译错误和警告（类型检查、语法错误等）',
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

      const result = await lspDiagnostics(fullPath);
      return { success: true, output: result || '(无诊断信息)' };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
