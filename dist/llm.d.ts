import { Message } from './types';
export declare function initClient(apiKey: string, baseURL?: string): void;
export declare function chat(model: string, messages: Message[], tools?: any[]): Promise<Message>;
/**
 * 流式调用 LLM，边生成边输出文本
 */
export declare function chatStreaming(model: string, messages: Message[], tools: any[], onChunk: (text: string) => void): Promise<Message>;
