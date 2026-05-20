import { Message } from './types';
export declare function countTokens(text: string): number;
export declare function countMessageTokens(msg: Message): number;
/**
 * 压缩消息历史，保留 system prompt + 最新消息，中间的截断
 */
export declare function compressMessages(messages: Message[], maxTokens?: number): Message[];
/**
 * 截断过长工具输出
 */
export declare function truncateToolOutput(output: string, maxChars?: number): string;
