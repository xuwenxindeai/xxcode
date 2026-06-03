import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from '../types';
import { getUndoManager } from './undo';

/**
 * 精确匹配失败时的模糊匹配：按行 trim 后比较，容忍缩进 / 行尾空白差异。
 * 返回唯一匹配的原始字符区间；多处匹配返回 'multiple'；无匹配返回 null。
 */
export function fuzzyMatchUnique(content: string, oldStr: string): { start: number; end: number } | 'multiple' | null {
  const cLines = content.split('\n');
  const oLines = oldStr.split('\n');
  if (oLines.length === 0) return null;
  const norm = (s: string) => s.trim();
  const oNorm = oLines.map(norm);
  const hits: { start: number; end: number }[] = [];
  for (let i = 0; i + oLines.length <= cLines.length; i++) {
    let ok = true;
    for (let j = 0; j < oLines.length; j++) {
      if (norm(cLines[i + j]) !== oNorm[j]) { ok = false; break; }
    }
    if (ok) {
      const start = cLines.slice(0, i).reduce((n, l) => n + l.length + 1, 0); // 每行 +1（\n）
      const matched = cLines.slice(i, i + oLines.length).join('\n');
      hits.push({ start, end: start + matched.length });
    }
  }
  if (hits.length === 0) return null;
  if (hits.length > 1) return 'multiple';
  return hits[0];
}

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
      const exact = content.split(args.old_string).length - 1;

      let newContent: string;
      let mode = '精确';
      if (exact === 1) {
        newContent = content.replace(args.old_string, args.new_string);
      } else if (exact > 1) {
        return { success: false, output: '', error: `匹配到 ${exact} 处，请提供更精确的 old_string（确保只匹配一处）` };
      } else {
        // 精确匹配失败 → 模糊匹配（忽略每行首尾空白 / 缩进差异）
        const fm = fuzzyMatchUnique(content, args.old_string);
        if (fm === 'multiple') {
          return { success: false, output: '', error: '模糊匹配到多处，请提供更长、更精确的 old_string' };
        }
        if (!fm) {
          const firstLine = (args.old_string.split('\n')[0] || '').slice(0, 60);
          return { success: false, output: '', error: `未找到匹配的文本块（精确与模糊均失败）。请核对 old_string 是否与文件一致（注意空白/缩进/换行）。首行：「${firstLine}」` };
        }
        newContent = content.slice(0, fm.start) + args.new_string + content.slice(fm.end);
        mode = '模糊';
      }

      fs.writeFileSync(fullPath, newContent, 'utf-8');
      return { success: true, output: `✅ 已编辑 ${fullPath}（${mode}匹配，${args.old_string.length}→${args.new_string.length} 字符）` };
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
