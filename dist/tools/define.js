"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDefaults = applyDefaults;
exports.withToolSafety = withToolSafety;
/**
 * 读取 JSON schema 里声明的默认值，填充缺失（undefined/null）的参数。
 *
 * 背景：LLM 的 function calling 不会用 schema 的 `default` 字段自动补全缺失参数，
 * 工具拿到的 args 里该字段就是 undefined，直接拿去 path.resolve / fs.* 会崩。
 * 这里在运行时把声明过的 default 补上，根治这一整类「缺参崩溃」。
 */
function applyDefaults(args, parameters) {
    const props = parameters?.properties;
    if (!props || typeof props !== 'object')
        return args;
    const out = { ...args };
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
function withToolSafety(tool) {
    return {
        ...tool,
        async execute(rawArgs, cwd) {
            const args = applyDefaults(rawArgs || {}, tool.parameters);
            const required = Array.isArray(tool.parameters?.required)
                ? tool.parameters.required
                : [];
            const missing = required.filter(k => args[k] === undefined || args[k] === null);
            if (missing.length > 0) {
                return { success: false, output: '', error: `缺少必填参数: ${missing.join(', ')}` };
            }
            try {
                // 调用原始 execute（保留 this 绑定到原工具对象）
                return await tool.execute(args, cwd);
            }
            catch (e) {
                return { success: false, output: '', error: e?.message || String(e) };
            }
        },
    };
}
//# sourceMappingURL=define.js.map