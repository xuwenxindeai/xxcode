import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolResult } from './types';

// ========== 钩子系统 ==========

export type HookEvent =
  | 'before_tool_execute'
  | 'after_tool_execute'
  | 'before_llm_call'
  | 'after_llm_response'
  | 'before_task'
  | 'after_task'
  | 'on_error';

export interface HookContext {
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: ToolResult;
  messages?: any[];
  error?: Error;
  taskName?: string;
  [key: string]: any;
}

export type HookHandler = (ctx: HookContext) => Promise<HookContext> | HookContext;

export class HookRegistry {
  private hooks = new Map<HookEvent, HookHandler[]>();

  on(event: HookEvent, handler: HookHandler): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(handler);
  }

  async emit(event: HookEvent, ctx: HookContext): Promise<HookContext> {
    const handlers = this.hooks.get(event) || [];
    let context = ctx;
    for (const handler of handlers) {
      context = await handler(context);
    }
    return context;
  }

  has(event: HookEvent): boolean {
    return (this.hooks.get(event)?.length ?? 0) > 0;
  }
}

// ========== 内置钩子 ==========

/**
 * 自动记录文件修改到日志
 */
export function createAuditLogHook(logDir: string): HookHandler {
  const logFile = path.join(logDir, 'agent-audit.log');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  return async (ctx: HookContext) => {
    if (ctx.toolName === 'after_tool_execute' && ctx.toolName) {
      const entry = `[${new Date().toISOString()}] ${ctx.toolName}(${JSON.stringify(ctx.toolArgs)}) → ${ctx.toolResult?.success ? '✅' : '❌'}\n`;
      fs.appendFileSync(logFile, entry);
    }
    return ctx;
  };
}

/**
 * 阻止修改特定文件（白名单模式）
 */
export function createProtectedFilesHook(protectedFiles: string[]): HookHandler {
  return async (ctx: HookContext) => {
    const writeTools = ['write_file', 'edit_file', 'append_file', 'apply_diff'];
    if (writeTools.includes(ctx.toolName || '')) {
      const filePath = ctx.toolArgs?.file_path || '';
      if (protectedFiles.some(pf => filePath.includes(pf))) {
        return {
          ...ctx,
          toolResult: {
            success: false,
            output: '',
            error: `⛔ 文件 ${filePath} 受保护，禁止修改`,
          },
        };
      }
    }
    return ctx;
  };
}

/**
 * 工具调用频率限制
 */
export function createRateLimitHook(maxCalls: number, windowMs: number): HookHandler {
  const callLog = new Map<string, number[]>();

  return async (ctx: HookContext) => {
    if (!ctx.toolName) return ctx;

    const now = Date.now();
    const calls = callLog.get(ctx.toolName) || [];
    const recentCalls = calls.filter(t => now - t < windowMs);

    if (recentCalls.length >= maxCalls) {
      return {
        ...ctx,
        toolResult: {
          success: false,
          output: '',
          error: `⏱️ 工具 ${ctx.toolName} 频率限制：${windowMs}ms 内最多 ${maxCalls} 次`,
        },
      };
    }

    recentCalls.push(now);
    callLog.set(ctx.toolName, recentCalls);
    return ctx;
  };
}

// 全局钩子注册表
export const globalHooks = new HookRegistry();
