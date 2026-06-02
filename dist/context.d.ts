import { Message } from './types';
export declare function countTokens(text: string): number;
export declare function countMessageTokens(msg: Message): number;
/**
 * 压缩消息历史，保留 system prompt + 最新消息，中间的截断
 */
export declare function compressMessages(messages: Message[], maxTokens?: number): Message[];
/** 估算整段消息的 token（粗估，用于 compact 阈值判断） */
export declare function estimateTokens(messages: Message[]): number;
/**
 * 自动压缩（compact）：上下文超过 maxTokens 时，把较老的一批对话交给 summarize 生成摘要，
 * 用一条摘要消息替换它们；保留 system + 最近 keepRecent 条，并维持 tool_call 配对。
 * 区别于 compressMessages 的"硬截断丢老消息"——这里把老对话摘要保留，避免 Agent 失忆。
 */
export declare function compactMessages(messages: Message[], maxTokens: number, summarize: (older: Message[]) => Promise<string>, keepRecent?: number): Promise<{
    messages: Message[];
    compacted: boolean;
    summarizedCount: number;
}>;
/**
 * 截断过长工具输出
 */
export declare function truncateToolOutput(output: string, maxChars?: number): string;
