import { streamText, generateText, tool, jsonSchema } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Message, messageText } from './types';

export type ProviderKind = 'openai-compatible' | 'anthropic' | 'google';

// 由 initClient 设置：根据 modelId 返回一个 AI SDK LanguageModel
let getModel: ((modelId: string) => any) | null = null;

/**
 * 初始化 LLM 客户端。
 * provider 决定底层走哪套协议（默认 openai-compatible，兼容 OpenAI/DashScope/DeepSeek/Kimi/本地等）；
 * anthropic / google 走各自原生协议。baseURL 仅 openai-compatible 必需（可覆盖 anthropic/google 默认）。
 */
export function initClient(apiKey: string, baseURL?: string, provider: ProviderKind = 'openai-compatible') {
  if (provider === 'anthropic') {
    const p = createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
    getModel = (id: string) => p(id);
  } else if (provider === 'google') {
    const p = createGoogleGenerativeAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    getModel = (id: string) => p(id);
  } else {
    const p = createOpenAICompatible({
      name: 'xxcode',
      baseURL: baseURL || 'https://api.openai.com/v1',
      apiKey,
    });
    getModel = (id: string) => p(id);
  }
}

// ── 格式转换 ──────────────────────────────

/** xxcode 的 Message[]（OpenAI 风格）→ AI SDK 的 ModelMessage[] */
export function toModelMessages(messages: Message[]): any[] {
  return messages.map((m) => {
    if (m.role === 'system') return { role: 'system', content: messageText(m) };
    if (m.role === 'user') return { role: 'user', content: messageText(m) };
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: [{
          type: 'tool-result',
          toolCallId: m.tool_call_id || '',
          toolName: m.name || 'tool',
          output: { type: 'text', value: messageText(m) },
        }],
      };
    }
    // assistant：可能同时有文本和 tool_calls
    const parts: any[] = [];
    const text = messageText(m);
    if (text) parts.push({ type: 'text', text });
    if (m.tool_calls) {
      for (const tc of m.tool_calls) {
        let input: any = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch { input = {}; }
        parts.push({ type: 'tool-call', toolCallId: tc.id, toolName: tc.function.name, input });
      }
    }
    return { role: 'assistant', content: parts.length ? parts : text };
  });
}

/** xxcode 的 OpenAI 风格 tools → AI SDK 的 tools 映射（不带 execute，由 Agent 主循环执行） */
export function toAITools(openaiTools: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const t of openaiTools || []) {
    const fn = t.function || t;
    if (!fn || !fn.name) continue;
    out[fn.name] = tool({
      description: fn.description || '',
      inputSchema: jsonSchema(fn.parameters || { type: 'object', properties: {} }),
    });
  }
  return out;
}

function aiToolCallsToOpenAI(toolCalls: any[]): Message['tool_calls'] {
  return (toolCalls || []).map((tc: any) => ({
    id: tc.toolCallId,
    type: 'function' as const,
    function: { name: tc.toolName, arguments: JSON.stringify(tc.input ?? {}) },
  }));
}

// ── 调用 ──────────────────────────────

export async function chat(model: string, messages: Message[], tools?: any[]): Promise<Message> {
  if (!getModel) throw new Error('LLM client not initialized');
  const aiTools = toAITools(tools || []);
  const hasTools = Object.keys(aiTools).length > 0;
  const { text, toolCalls } = await generateText({
    model: getModel(model),
    messages: toModelMessages(messages),
    ...(hasTools ? { tools: aiTools, toolChoice: 'auto' as const } : {}),
  });
  const msg: Message = { role: 'assistant', content: text || '' };
  if (toolCalls && toolCalls.length > 0) msg.tool_calls = aiToolCallsToOpenAI(toolCalls);
  return msg;
}

/**
 * 流式调用：边生成边把正文喂给 onChunk（reasoning 思考链忽略，保持原有展示行为）。
 * 用 AI SDK 的 fullStream 手动累积，不依赖 chunk 的 role，天然规避 "missing role" 这类问题。
 */
export async function chatStreaming(
  model: string,
  messages: Message[],
  tools: any[],
  onChunk: (text: string) => void
): Promise<Message> {
  if (!getModel) throw new Error('LLM client not initialized');
  const aiTools = toAITools(tools || []);
  const hasTools = Object.keys(aiTools).length > 0;

  const result = streamText({
    model: getModel(model),
    messages: toModelMessages(messages),
    ...(hasTools ? { tools: aiTools, toolChoice: 'auto' as const } : {}),
  });

  let fullContent = '';
  const toolCalls: any[] = [];
  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      const t = (part as any).text || '';
      onChunk(t);
      fullContent += t;
    } else if (part.type === 'tool-call') {
      const p = part as any;
      toolCalls.push({ toolCallId: p.toolCallId, toolName: p.toolName, input: p.input });
    } else if (part.type === 'error') {
      throw (part as any).error || new Error('流式响应出错');
    }
    // reasoning-delta / tool-input-* / start / finish 等忽略
  }

  const msg: Message = { role: 'assistant', content: fullContent };
  if (toolCalls.length > 0) msg.tool_calls = aiToolCallsToOpenAI(toolCalls);
  return msg;
}
