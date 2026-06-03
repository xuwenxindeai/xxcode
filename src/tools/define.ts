import { Tool, ToolResult } from '../types';

// 这些工具可能合法地长时间运行（装依赖 / 跑命令 / 起服务），超时放宽
const SHELL_LIKE = new Set(['run_shell', 'docker_exec', 'docker_compose', 'npm_manage', 'pip_manage', 'python_repl', 'start_http_server', 'ssh_exec', 'curl_request']);

/**
 * 读取 JSON schema 里声明的默认值，填充缺失（undefined/null）的参数。
 *
 * 背景：LLM 的 function calling 不会用 schema 的 `default` 字段自动补全缺失参数，
 * 工具拿到的 args 里该字段就是 undefined，直接拿去 path.resolve / fs.* 会崩。
 * 这里在运行时把声明过的 default 补上，根治这一整类「缺参崩溃」。
 */
export function applyDefaults(
  args: Record<string, any>,
  parameters: Record<string, any> | undefined
): Record<string, any> {
  const props = parameters?.properties;
  if (!props || typeof props !== 'object') return args;
  const out: Record<string, any> = { ...args };
  for (const key of Object.keys(props)) {
    const spec = props[key];
    if ((out[key] === undefined || out[key] === null) && spec && spec.default !== undefined) {
      out[key] = spec.default;
    }
  }
  return out;
}

/**
 * 给工具统一加上运行时保护，不改动工具内部逻辑：
 *  1. 默认值填充 —— schema 里写了 default 的可选参数，缺失时自动补上；
 *  2. 必填校验 —— parameters.required 里的参数缺失时，提前返回清晰错误，而不是崩在工具内部；
 *  3. 错误兜底 —— execute 抛出的任何异常统一转成 ToolResult，避免单个工具异常拖垮整个 Agent 主循环。
 */
export function withToolSafety(tool: Tool): Tool {
  return {
    ...tool,
    async execute(rawArgs: Record<string, any>, cwd: string): Promise<ToolResult> {
      const args = applyDefaults(rawArgs || {}, tool.parameters);

      const required: string[] = Array.isArray(tool.parameters?.required)
        ? tool.parameters.required
        : [];
      const missing = required.filter(k => args[k] === undefined || args[k] === null);
      if (missing.length > 0) {
        return { success: false, output: '', error: `缺少必填参数: ${missing.join(', ')}` };
      }

      const timeoutMs = SHELL_LIKE.has(tool.name) ? 300_000 : 90_000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // 整体超时：防止个别工具（网络 / 浏览器 / docker）永久挂起卡死 Agent 主循环
        return await Promise.race<ToolResult>([
          tool.execute(args, cwd),
          new Promise<ToolResult>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`工具 ${tool.name} 执行超时（${timeoutMs / 1000}s）`)), timeoutMs);
          }),
        ]);
      } catch (e: any) {
        return { success: false, output: '', error: e?.message || String(e) };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}
