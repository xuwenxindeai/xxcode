import { ToolResult } from './types';
export type HookEvent = 'before_tool_execute' | 'after_tool_execute' | 'before_llm_call' | 'after_llm_response' | 'before_task' | 'after_task' | 'on_error';
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
export declare class HookRegistry {
    private hooks;
    on(event: HookEvent, handler: HookHandler): void;
    emit(event: HookEvent, ctx: HookContext): Promise<HookContext>;
    has(event: HookEvent): boolean;
}
/**
 * 自动记录文件修改到日志
 */
export declare function createAuditLogHook(logDir: string): HookHandler;
/**
 * 阻止修改特定文件（白名单模式）
 */
export declare function createProtectedFilesHook(protectedFiles: string[]): HookHandler;
/**
 * 工具调用频率限制
 */
export declare function createRateLimitHook(maxCalls: number, windowMs: number): HookHandler;
export declare const globalHooks: HookRegistry;
