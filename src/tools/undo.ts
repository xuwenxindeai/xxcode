import { Tool, ToolResult } from '../types';
import { UndoManager } from '../undo';

// 全局 undo 实例
let undoManager: UndoManager | null = null;

export function getUndoManager(): UndoManager {
  if (!undoManager) {
    undoManager = new UndoManager(50);
  }
  return undoManager;
}

// 撤销
export const undoTool: Tool = {
  name: 'undo',
  description: '撤销上一次文件修改',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, _cwd): Promise<ToolResult> {
    const mgr = getUndoManager();
    const result = mgr.undo();
    return { success: result.success, output: result.message, error: result.success ? undefined : result.message };
  },
};

// 重做
export const redoTool: Tool = {
  name: 'redo',
  description: '重做上一次撤销的操作',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, _cwd): Promise<ToolResult> {
    const mgr = getUndoManager();
    const result = mgr.redo();
    return { success: result.success, output: result.message, error: result.success ? undefined : result.message };
  },
};

// 查看历史
export const undoHistoryTool: Tool = {
  name: 'undo_history',
  description: '查看撤销/重做历史',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, _cwd): Promise<ToolResult> {
    const mgr = getUndoManager();
    return { success: true, output: mgr.getHistory() };
  },
};
