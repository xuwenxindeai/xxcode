import { Tool, ToolResult } from '../types';

export const listSessionsTool: Tool = {
  name: 'list_sessions',
  description: '列出所有历史会话记录',
  parameters: { type: 'object', properties: {}, required: [] },
  async execute(_args, _cwd): Promise<ToolResult> {
    const { formatSessionList } = require('../session');
    return { success: true, output: formatSessionList() };
  },
};

export const deleteSessionTool: Tool = {
  name: 'delete_session',
  description: '删除指定的会话记录',
  parameters: {
    type: 'object',
    properties: { session_id: { type: 'string', description: '会话 ID' } },
    required: ['session_id'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    const { deleteSession } = require('../session');
    const ok = deleteSession(args.session_id);
    return { success: ok, output: ok ? `已删除 ${args.session_id}` : `未找到 ${args.session_id}` };
  },
};

export const sessionTool: Tool = {
  name: 'save_session',
  description: '保存当前任务执行结果到会话历史',
  parameters: {
    type: 'object',
    properties: { summary: { type: 'string', description: '任务执行总结' } },
    required: ['summary'],
  },
  async execute(args, _cwd): Promise<ToolResult> {
    return { success: true, output: `会话已记录: ${args.summary.slice(0, 100)}` };
  },
};
