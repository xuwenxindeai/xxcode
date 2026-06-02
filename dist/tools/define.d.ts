import { Tool } from '../types';
/**
 * 读取 JSON schema 里声明的默认值，填充缺失（undefined/null）的参数。
 *
 * 背景：LLM 的 function calling 不会用 schema 的 `default` 字段自动补全缺失参数，
 * 工具拿到的 args 里该字段就是 undefined，直接拿去 path.resolve / fs.* 会崩。
 * 这里在运行时把声明过的 default 补上，根治这一整类「缺参崩溃」。
 */
export declare function applyDefaults(args: Record<string, any>, parameters: Record<string, any> | undefined): Record<string, any>;
/**
 * 给工具统一加上运行时保护，不改动工具内部逻辑：
 *  1. 默认值填充 —— schema 里写了 default 的可选参数，缺失时自动补上；
 *  2. 必填校验 —— parameters.required 里的参数缺失时，提前返回清晰错误，而不是崩在工具内部；
 *  3. 错误兜底 —— execute 抛出的任何异常统一转成 ToolResult，避免单个工具异常拖垮整个 Agent 主循环。
 */
export declare function withToolSafety(tool: Tool): Tool;
