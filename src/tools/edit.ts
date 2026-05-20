import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from '../types';
import { getUndoManager } from './undo';

// 精准编辑文件内容（自动快照）
export const editFileTool: Tool = {
  name: 'edit_file',
  description: '精准替换文件中的文本块，保留其余内容不变。修改前自动保存快照。',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      old_string: { type: 'string', description: '要替换的原文本（必须精确匹配）' },
      new_string: { type: 'string', description: '替换后的新文本' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (!fs.existsSync(fullPath)) {
        return { success: false, output: '', error: `文件不存在: ${fullPath}` };
      }

      // 自动快照
      getUndoManager().saveBefore(fullPath);

      const content = fs.readFileSync(fullPath, 'utf-8');
      const occurrences = content.split(args.old_string).length - 1;

      if (occurrences === 0) {
        return {
          success: false,
          output: '',
          error: `未找到匹配的文本块。文件内容长度: ${content.length}，搜索长度: ${args.old_string.length}`,
        };
      }

      if (occurrences > 1) {
        return {
          success: false,
          output: '',
          error: `匹配到 ${occurrences} 处，请提供更精确的 old_string（确保只匹配一处）`,
        };
      }

      const newContent = content.replace(args.old_string, args.new_string);
      fs.writeFileSync(fullPath, newContent, 'utf-8');

      const diffPreview = `替换了 ${args.old_string.length} 字符 → ${args.new_string.length} 字符`;
      return { success: true, output: `✅ 已编辑 ${fullPath}\n${diffPreview}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};

// 追加内容到文件末尾（自动快照）
export const appendFileTool: Tool = {
  name: 'append_file',
  description: '追加文本到文件末尾（不覆盖）。修改前自动保存快照。',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '文件路径' },
      content: { type: 'string', description: '要追加的内容' },
    },
    required: ['file_path', 'content'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    try {
      const fullPath = path.isAbsolute(args.file_path)
        ? args.file_path
        : path.resolve(cwd, args.file_path);

      if (fs.existsSync(fullPath)) {
        getUndoManager().saveBefore(fullPath);
      }

      fs.appendFileSync(fullPath, args.content, 'utf-8');
      return { success: true, output: `✅ 已追加 ${args.content.length} 字符到 ${fullPath}` };
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    }
  },
};
