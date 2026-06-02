import { Message } from './types';
export type ProviderKind = 'openai-compatible' | 'anthropic' | 'google';
/**
 * 初始化 LLM 客户端。
 * provider 决定底层走哪套协议（默认 openai-compatible，兼容 OpenAI/DashScope/DeepSeek/Kimi/本地等）；
 * anthropic / google 走各自原生协议。baseURL 仅 openai-compatible 必需（可覆盖 anthropic/google 默认）。
 */
export declare function initClient(apiKey: string, baseURL?: string, provider?: ProviderKind): void;
/** xxcode 的 Message[]（OpenAI 风格）→ AI SDK 的 ModelMessage[] */
export declare function toModelMessages(messages: Message[]): any[];
/** xxcode 的 OpenAI 风格 tools → AI SDK 的 tools 映射（不带 execute，由 Agent 主循环执行） */
export declare function toAITools(openaiTools: any[]): Record<string, any>;
/** 把 system 消息从对话里抽出来：AI SDK 推荐 system 走独立参数（消除 prompt-injection 警告、更安全） */
export declare function splitSystem(messages: Message[]): {
    system?: string;
    rest: Message[];
};
export declare function chat(model: string, messages: Message[], tools?: any[]): Promise<Message>;
/**
 * 流式调用：边生成边把正文喂给 onChunk（reasoning 思考链忽略，保持原有展示行为）。
 * 用 AI SDK 的 fullStream 手动累积，不依赖 chunk 的 role，天然规避 "missing role" 这类问题。
 */
export declare function chatStreaming(model: string, messages: Message[], tools: any[], onChunk: (text: string) => void): Promise<Message>;
