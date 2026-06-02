import { Message, messageText } from './types';

export function countTokens(text: string): number {
  // 粗略估算：中文 ~1.5 token/字，英文 ~0.25 token/字符
  let chinese = 0;
  let other = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) chinese++;
    else other++;
  }
  return Math.ceil(chinese * 1.5) + Math.ceil(other * 0.25);
}

export function countMessageTokens(msg: Message): number {
  let total = countTokens(messageText(msg) || '');
  total += 4; // role + overhead
  if (msg.tool_calls) total += countTokens(JSON.stringify(msg.tool_calls));
  if (msg.tool_call_id) total += countTokens(msg.tool_call_id);
  if (msg.name) total += countTokens(msg.name);
  if (Array.isArray(msg.content)) {
    total += msg.content.length * 85; // image_url 基础开销
  }
  return total;
}

/**
 * 压缩消息历史，保留 system prompt + 最新消息，中间的截断
 */
export function compressMessages(
  messages: Message[],
  maxTokens: number = 80000
): Message[] {
  const systemMessages = messages.filter(m => m.role === 'system');
  
  // 从后往前保留最近的对话
  const compressed: Message[] = [...systemMessages];
  let usedTokens = compressed.reduce((sum, m) => sum + countMessageTokens(m), 0);

  const recentMessages = [...messages].reverse();
  for (const msg of recentMessages) {
    if (msg.role === 'system') continue;
    
    const msgTokens = countMessageTokens(msg);
    if (usedTokens + msgTokens > maxTokens) {
      break;
    }
    compressed.unshift(msg);
    usedTokens += msgTokens;
  }

  // 确保 system prompt 在最前
  const recent = compressed.filter(m => m.role !== 'system');
  // 保持 tool_call 配对：丢弃开头悬空的 tool 消息（其对应的 assistant.tool_calls 已被截断），
  // 否则下一次请求会因 "tool 消息缺少对应 tool_calls" 被 API 拒绝（HTTP 400）
  while (recent.length > 0 && recent[0].role === 'tool') recent.shift();
  return systemMessages.concat(recent);
}

/** 估算整段消息的 token（粗估，用于 compact 阈值判断） */
export function estimateTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + countMessageTokens(m), 0);
}

/**
 * 自动压缩（compact）：上下文超过 maxTokens 时，把较老的一批对话交给 summarize 生成摘要，
 * 用一条摘要消息替换它们；保留 system + 最近 keepRecent 条，并维持 tool_call 配对。
 * 区别于 compressMessages 的"硬截断丢老消息"——这里把老对话摘要保留，避免 Agent 失忆。
 */
export async function compactMessages(
  messages: Message[],
  maxTokens: number,
  summarize: (older: Message[]) => Promise<string>,
  keepRecent: number = 6
): Promise<{ messages: Message[]; compacted: boolean; summarizedCount: number }> {
  if (estimateTokens(messages) <= maxTokens) return { messages, compacted: false, summarizedCount: 0 };

  const system = messages.filter(m => m.role === 'system');
  const conv = messages.filter(m => m.role !== 'system');
  if (conv.length <= keepRecent + 2) return { messages, compacted: false, summarizedCount: 0 };

  const older = conv.slice(0, conv.length - keepRecent);
  let recent = conv.slice(conv.length - keepRecent);
  // 维持配对：recent 开头不能是悬空 tool（其 assistant.tool_calls 已被并入 older 摘要）
  while (recent.length > 0 && recent[0].role === 'tool') recent.shift();

  const summary = await summarize(older);
  const summaryMsg: Message = { role: 'assistant', content: `[之前对话的摘要]\n${summary}` };
  return { messages: [...system, summaryMsg, ...recent], compacted: true, summarizedCount: older.length };
}

/**
 * 截断过长工具输出
 */
export function truncateToolOutput(output: string, maxChars: number = 3000): string {
  if (output.length <= maxChars) return output;
  const keep = maxChars - 50;
  return output.slice(0, keep) + '\n\n...(输出过长，已截断)';
}
