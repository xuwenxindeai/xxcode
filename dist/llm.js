"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastUsage = getLastUsage;
exports.initClient = initClient;
exports.toModelMessages = toModelMessages;
exports.toAITools = toAITools;
exports.splitSystem = splitSystem;
exports.chat = chat;
exports.chatStreaming = chatStreaming;
const ai_1 = require("ai");
const openai_compatible_1 = require("@ai-sdk/openai-compatible");
const anthropic_1 = require("@ai-sdk/anthropic");
const google_1 = require("@ai-sdk/google");
const types_1 = require("./types");
// 由 initClient 设置：根据 modelId 返回一个 AI SDK LanguageModel
let getModel = null;
// 最近一次 LLM 调用的真实 usage（部分 provider 如 DashScope 不回传，则字段为 undefined，调用方退回估算）
let _lastUsage = {};
function getLastUsage() { return _lastUsage; }
/**
 * 初始化 LLM 客户端。
 * provider 决定底层走哪套协议（默认 openai-compatible，兼容 OpenAI/DashScope/DeepSeek/Kimi/本地等）；
 * anthropic / google 走各自原生协议。baseURL 仅 openai-compatible 必需（可覆盖 anthropic/google 默认）。
 */
function initClient(apiKey, baseURL, provider = 'openai-compatible') {
    if (provider === 'anthropic') {
        const p = (0, anthropic_1.createAnthropic)({ apiKey, ...(baseURL ? { baseURL } : {}) });
        getModel = (id) => p(id);
    }
    else if (provider === 'google') {
        const p = (0, google_1.createGoogleGenerativeAI)({ apiKey, ...(baseURL ? { baseURL } : {}) });
        getModel = (id) => p(id);
    }
    else {
        const p = (0, openai_compatible_1.createOpenAICompatible)({
            name: 'xxcode',
            baseURL: baseURL || 'https://api.openai.com/v1',
            apiKey,
            includeUsage: true, // 流式带 stream_options.include_usage，拿到真实 token usage（DashScope 默认不回，需要这个）
        });
        getModel = (id) => p(id);
    }
}
// ── 格式转换 ──────────────────────────────
/** xxcode 的 Message[]（OpenAI 风格）→ AI SDK 的 ModelMessage[] */
function toModelMessages(messages) {
    return messages.map((m) => {
        if (m.role === 'system')
            return { role: 'system', content: (0, types_1.messageText)(m) };
        if (m.role === 'user')
            return { role: 'user', content: (0, types_1.messageText)(m) };
        if (m.role === 'tool') {
            return {
                role: 'tool',
                content: [{
                        type: 'tool-result',
                        toolCallId: m.tool_call_id || '',
                        toolName: m.name || 'tool',
                        output: { type: 'text', value: (0, types_1.messageText)(m) },
                    }],
            };
        }
        // assistant：可能同时有文本和 tool_calls
        const parts = [];
        const text = (0, types_1.messageText)(m);
        if (text)
            parts.push({ type: 'text', text });
        if (m.tool_calls) {
            for (const tc of m.tool_calls) {
                let input = {};
                try {
                    input = JSON.parse(tc.function.arguments || '{}');
                }
                catch {
                    input = {};
                }
                parts.push({ type: 'tool-call', toolCallId: tc.id, toolName: tc.function.name, input });
            }
        }
        return { role: 'assistant', content: parts.length ? parts : text };
    });
}
/** xxcode 的 OpenAI 风格 tools → AI SDK 的 tools 映射（不带 execute，由 Agent 主循环执行） */
function toAITools(openaiTools) {
    const out = {};
    for (const t of openaiTools || []) {
        const fn = t.function || t;
        if (!fn || !fn.name)
            continue;
        out[fn.name] = (0, ai_1.tool)({
            description: fn.description || '',
            inputSchema: (0, ai_1.jsonSchema)(fn.parameters || { type: 'object', properties: {} }),
        });
    }
    return out;
}
function aiToolCallsToOpenAI(toolCalls) {
    return (toolCalls || []).map((tc) => ({
        id: tc.toolCallId,
        type: 'function',
        function: { name: tc.toolName, arguments: JSON.stringify(tc.input ?? {}) },
    }));
}
/** 把 system 消息从对话里抽出来：AI SDK 推荐 system 走独立参数（消除 prompt-injection 警告、更安全） */
function splitSystem(messages) {
    const sys = messages.filter(m => m.role === 'system').map(m => (0, types_1.messageText)(m)).filter(Boolean);
    const rest = messages.filter(m => m.role !== 'system');
    return { system: sys.length ? sys.join('\n\n') : undefined, rest };
}
// ── 调用 ──────────────────────────────
async function chat(model, messages, tools) {
    if (!getModel)
        throw new Error('LLM client not initialized');
    const aiTools = toAITools(tools || []);
    const hasTools = Object.keys(aiTools).length > 0;
    const { system, rest } = splitSystem(messages);
    const { text, toolCalls } = await (0, ai_1.generateText)({
        model: getModel(model),
        maxRetries: 3,
        ...(system ? { system } : {}),
        messages: toModelMessages(rest),
        ...(hasTools ? { tools: aiTools, toolChoice: 'auto' } : {}),
    });
    const msg = { role: 'assistant', content: text || '' };
    if (toolCalls && toolCalls.length > 0)
        msg.tool_calls = aiToolCallsToOpenAI(toolCalls);
    return msg;
}
/**
 * 流式调用：边生成边把正文喂给 onChunk（reasoning 思考链忽略，保持原有展示行为）。
 * 用 AI SDK 的 fullStream 手动累积，不依赖 chunk 的 role，天然规避 "missing role" 这类问题。
 */
async function chatStreaming(model, messages, tools, onChunk) {
    if (!getModel)
        throw new Error('LLM client not initialized');
    const aiTools = toAITools(tools || []);
    const hasTools = Object.keys(aiTools).length > 0;
    const { system, rest } = splitSystem(messages);
    const result = (0, ai_1.streamText)({
        model: getModel(model),
        maxRetries: 3,
        ...(system ? { system } : {}),
        messages: toModelMessages(rest),
        ...(hasTools ? { tools: aiTools, toolChoice: 'auto' } : {}),
    });
    let fullContent = '';
    const toolCalls = [];
    for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
            const t = part.text || '';
            onChunk(t);
            fullContent += t;
        }
        else if (part.type === 'tool-call') {
            const p = part;
            toolCalls.push({ toolCallId: p.toolCallId, toolName: p.toolName, input: p.input });
        }
        else if (part.type === 'finish') {
            _lastUsage = part.totalUsage || {};
        }
        else if (part.type === 'error') {
            throw part.error || new Error('流式响应出错');
        }
        // reasoning-delta / tool-input-* / start 等忽略
    }
    const msg = { role: 'assistant', content: fullContent };
    if (toolCalls.length > 0)
        msg.tool_calls = aiToolCallsToOpenAI(toolCalls);
    return msg;
}
//# sourceMappingURL=llm.js.map