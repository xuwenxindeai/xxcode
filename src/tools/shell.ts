import { exec } from 'child_process';
import * as util from 'util';
import { Tool, ToolResult } from '../types';
import { isDangerous } from '../approval';

const execAsync = util.promisify(exec);

/**
 * 设置审批回调（由 Agent 注入）
 */
let approvalCallback: ((command: string) => Promise<boolean>) | null = null;

export function setApprovalHandler(handler: (command: string) => Promise<boolean>) {
  approvalCallback = handler;
}

/**
 * 长命令执行心跳回调（用于保持 spinner 活跃）
 */
let heartbeatCallback: ((msg: string) => void) | null = null;

export function setHeartbeatHandler(handler: (msg: string) => void) {
  heartbeatCallback = handler;
}

// 执行 Shell 命令
export const shellTool: Tool = {
  name: 'run_shell',
  description: '执行 Shell 命令并返回输出。危险命令会被拦截。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的 Shell 命令' },
    },
    required: ['command'],
  },
  async execute(args, cwd): Promise<ToolResult> {
    // 检查是否危险
    if (isDangerous(args.command) && approvalCallback) {
      const approved = await approvalCallback(args.command);
      if (!approved) {
        return { success: false, output: '', error: '用户拒绝执行此命令' };
      }
    }

    // npm install 命令需要更长超时（5 分钟）
    const isNpmInstall = /npm\s+(install|i)\s/.test(args.command);
    const timeout = isNpmInstall ? 300000 : 120000;

    // 长命令执行时发送心跳，保持 spinner 活跃
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    if (timeout > 30000 && heartbeatCallback) {
      const elapsed = { value: 0 };
      heartbeatInterval = setInterval(() => {
        elapsed.value += 3;
        heartbeatCallback!(`⏳ 命令执行中... ${elapsed.value}s`);
      }, 3000);
    }

    try {
      const { stdout, stderr } = await execAsync(args.command, {
        cwd,
        timeout,
        maxBuffer: 2 * 1024 * 1024,
      });
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(无输出)' };
    } catch (e: any) {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      const output = e.stdout || '';
      const error = e.stderr || e.message;
      return { success: false, output, error };
    }
  },
};
